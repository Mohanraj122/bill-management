from fastapi import FastAPI, Depends, HTTPException, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import models
from database import SessionLocal, engine
from security import get_password_hash, verify_password, create_access_token, get_current_user, require_admin, verify_google_token
from fastapi.security import OAuth2PasswordRequestForm

models.Base.metadata.create_all(bind=engine)

import sqlite3
try:
    with sqlite3.connect("business.db") as conn:
        conn.execute("ALTER TABLE orders ADD COLUMN walk_in_name VARCHAR;")
except Exception:
    pass
try:
    with sqlite3.connect("business.db") as conn:
        conn.execute("ALTER TABLE users ADD COLUMN mobile VARCHAR;")
except Exception:
    pass

app = FastAPI(title="Bill & Stock Management Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- Auth Schemas & Endpoints ----
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class GoogleAuthRequest(BaseModel):
    credential: str
    client_id: str

class UserCreate(BaseModel):
    username: str
    password: str
    mobile: Optional[str] = None
    role: str = "staff"

class UserSignup(BaseModel):
    username: str
    mobile: str
    password: str

@app.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        or_(models.User.username == form_data.username, models.User.mobile == form_data.username)
    ).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username/mobile or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username}

@app.post("/auth/signup", response_model=Token)
def signup(user: UserSignup, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(models.User).filter(models.User.mobile == user.mobile).first():
        raise HTTPException(status_code=400, detail="Mobile number already registered")
        
    role = "admin" if db.query(models.User).count() == 0 else "staff"
    
    db_user = models.User(
        username=user.username,
        mobile=user.mobile,
        hashed_password=get_password_hash(user.password),
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer", "role": db_user.role, "username": db_user.username}

@app.post("/auth/google", response_model=Token)
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    idinfo = verify_google_token(req.credential, req.client_id)
    if not idinfo:
        raise HTTPException(status_code=401, detail="Invalid Google Token")
    
    email = idinfo.get("email")
    user = db.query(models.User).filter(models.User.google_id == email).first()
    if not user:
        if db.query(models.User).count() == 0:
            user = models.User(username=email, google_id=email, role="admin")
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=403, detail="Unregistered Google Account")
            
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username}

protected_router = APIRouter(dependencies=[Depends(get_current_user)])

@protected_router.post("/users")
def create_sub_account(u: UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    if db.query(models.User).filter(models.User.username == u.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if u.mobile and db.query(models.User).filter(models.User.mobile == u.mobile).first():
        raise HTTPException(status_code=400, detail="Mobile number already exists")
    db_user = models.User(username=u.username, mobile=u.mobile, hashed_password=get_password_hash(u.password), role=u.role)
    db.add(db_user)
    db.commit()
    return {"message": "User created"}

@protected_router.get("/users")
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    users = db.query(models.User).all()
    return [{"id": u.id, "username": u.username, "mobile": u.mobile, "role": u.role, "google_id": u.google_id} for u in users]

@protected_router.delete("/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user: raise HTTPException(404)
    if user.id == current_user.id: raise HTTPException(400, "Cannot delete yourself")
    db.delete(user)
    db.commit()
    return {"message": "Deleted"}

# ---- Schemas ----
class ProductCreate(BaseModel):
    sku: str
    name: str
    pieces_per_case: int = 1
    case_price: float = 0.0
    piece_price: float = 0.0
    tax_rate: float = 0.18
    stock_quantity: int = 0

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None

class CustomerPriceCreate(BaseModel):
    product_id: int
    custom_price: float

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int   # In pieces
    unit_price: float 

class OrderCreate(BaseModel):
    customer_id: Optional[int] = None
    walk_in_name: Optional[str] = None
    items: List[OrderItemCreate]

class VendorCreate(BaseModel):
    name: str

class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity: int # pieces
    unit_cost: float

class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    items: List[PurchaseOrderItemCreate]

# ---- Products API ----
@protected_router.post("/products")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    return db_product

@protected_router.put("/products/{id}")
def update_product(id: int, product: ProductCreate, db: Session = Depends(get_db)):
    db_prod = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_prod: raise HTTPException(404)
    for k, v in product.model_dump().items():
        setattr(db_prod, k, v)
    db.commit()
    return db_prod

@protected_router.delete("/products/{id}")
def delete_product(id: int, db: Session = Depends(get_db)):
    if db.query(models.OrderItem).filter(models.OrderItem.product_id == id).first():
        raise HTTPException(400, "Cannot delete product with existing sales history.")
    db.query(models.Product).filter(models.Product.id == id).delete()
    db.commit()
    return {"message": "Deleted"}

@protected_router.get("/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.id.desc()).all()

# ---- Customers API ----
@protected_router.post("/customers")
def create_customer(c: CustomerCreate, db: Session = Depends(get_db)):
    db_c = models.Customer(**c.model_dump())
    db.add(db_c)
    db.commit()
    db.refresh(db_c)
    return db_c

@protected_router.get("/customers")
def get_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).all()

@protected_router.delete("/customers/{id}")
def delete_customer(id: int, db: Session = Depends(get_db)):
    if db.query(models.Order).filter(models.Order.customer_id == id).first():
        raise HTTPException(400, "Customer has existing orders")
    db.query(models.CustomerProductPrice).filter(models.CustomerProductPrice.customer_id == id).delete()
    db.query(models.Customer).filter(models.Customer.id == id).delete()
    db.commit()
    return {"message": "Deleted"}

@protected_router.post("/customers/{id}/prices")
def set_customer_price(id: int, price: CustomerPriceCreate, db: Session = Depends(get_db)):
    existing = db.query(models.CustomerProductPrice).filter(
        models.CustomerProductPrice.customer_id == id,
        models.CustomerProductPrice.product_id == price.product_id
    ).first()
    if existing:
        existing.custom_price = price.custom_price
    else:
        db.add(models.CustomerProductPrice(customer_id=id, **price.model_dump()))
    db.commit()
    return {"message": "Saved"}

@protected_router.get("/customers/{id}/prices")
def get_customer_prices(id: int, db: Session = Depends(get_db)):
    return db.query(models.CustomerProductPrice).filter(models.CustomerProductPrice.customer_id == id).all()

# ---- Vendors & POs ----
@protected_router.post("/vendors")
def create_vendor(v: VendorCreate, db: Session = Depends(get_db)):
    db_v = models.Vendor(**v.model_dump())
    db.add(db_v)
    db.commit()
    return db_v

@protected_router.get("/vendors")
def get_vendors(db: Session = Depends(get_db)):
    return db.query(models.Vendor).all()

@protected_router.delete("/vendors/{id}")
def delete_vendor(id: int, db: Session = Depends(get_db)):
    if db.query(models.PurchaseOrder).filter(models.PurchaseOrder.vendor_id == id).first():
        raise HTTPException(400, "Vendor has POs")
    db.query(models.Vendor).filter(models.Vendor.id == id).delete()
    db.commit()
    return {"message": "Deleted"}

@protected_router.post("/purchases")
def create_po(po: PurchaseOrderCreate, db: Session = Depends(get_db)):
    db_po = models.PurchaseOrder(vendor_id=po.vendor_id)
    db.add(db_po)
    db.flush()
    total = 0
    for item in po.items:
        db.add(models.PurchaseOrderItem(purchase_order_id=db_po.id, **item.model_dump()))
        total += (item.quantity * item.unit_cost)
    db_po.total_amount = total
    db.commit()
    return {"message": "Draft PO Created"}

@protected_router.post("/purchases/{po_id}/receive")
def receive_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po or po.status == "received": raise HTTPException(400)
        
    for item in po.items:
        db.query(models.Product).filter(models.Product.id == item.product_id).first().stock_quantity += item.quantity
    po.status = "received"
    db.add(models.Ledger(amount=po.total_amount, transaction_type="expense", reference_id=f"PO-{po.id}"))
    db.commit()
    return {"message": "Stock Increased"}

@protected_router.get("/purchases")
def get_purchases(db: Session = Depends(get_db)):
    return db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.id.desc()).all()

# ---- Sales Flow ----
@protected_router.post("/orders")
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    db_order = models.Order(customer_id=order.customer_id, walk_in_name=order.walk_in_name)
    db.add(db_order)
    db.flush()
    
    total_amount = 0
    total_gst = 0
    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product or product.stock_quantity < item.quantity:
            db.rollback()
            raise HTTPException(400, f"Insufficient stock for {product.name if product else 'item'}")
            
        product.stock_quantity -= item.quantity # REDUCE STOCK
        
        db_item = models.OrderItem(order_id=db_order.id, product_id=product.id, quantity=item.quantity, unit_price=item.unit_price)
        db.add(db_item)
        
        item_total = item.unit_price * item.quantity
        total_amount += item_total
        total_gst += item_total * product.tax_rate
        
    db_order.total_amount = total_amount
    db_order.status = "confirmed"
    
    invoice_total = total_amount + total_gst
    db_invoice = models.Invoice(order_id=db_order.id, total_amount=invoice_total, gst_amount=total_gst, status="unpaid")
    db.add(db_invoice)
    db.commit()
    return {"message": "Order processing complete. Invoice generated."}

@protected_router.post("/invoices/{id}/pay")
def pay_invoice(id: int, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == id).first()
    if not invoice or invoice.status == "paid": raise HTTPException(400)
    invoice.status = "paid"
    db.add(models.Ledger(amount=invoice.total_amount - invoice.gst_amount, transaction_type="revenue", reference_id=f"INV-{invoice.id}"))
    db.add(models.Ledger(amount=invoice.gst_amount, transaction_type="tax", reference_id=f"INV-{invoice.id}"))
    db.commit()
    return {"message": "Success"}

@protected_router.get("/invoices")
def get_invoices(db: Session = Depends(get_db)):
    invoices = db.query(models.Invoice).order_by(models.Invoice.id.desc()).all()
    results = []
    for inv in invoices:
        order = db.query(models.Order).filter(models.Order.id == inv.order_id).first()
        customer_name = order.walk_in_name or "Walk-in"
        if order.customer_id:
            cust = db.query(models.Customer).filter(models.Customer.id == order.customer_id).first()
            if cust: customer_name = cust.name
            
        inv_dict = {
            "id": inv.id,
            "order_id": inv.order_id,
            "total_amount": inv.total_amount,
            "gst_amount": inv.gst_amount,
            "status": inv.status,
            "created_at": inv.created_at,
            "customer_name": customer_name
        }
        results.append(inv_dict)
    return results

@protected_router.get("/invoices/{id}/details")
def get_invoice_details(id: int, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == id).first()
    if not inv: raise HTTPException(404)
    
    order = db.query(models.Order).filter(models.Order.id == inv.order_id).first()
    customer_name = order.walk_in_name or "Walk-in"
    customer_phone = ""
    
    if order.customer_id:
        cust = db.query(models.Customer).filter(models.Customer.id == order.customer_id).first()
        if cust: 
            customer_name = cust.name
            customer_phone = cust.phone

    order_items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
    
    items_out = []
    for oi in order_items:
        prod = db.query(models.Product).filter(models.Product.id == oi.product_id).first()
        items_out.append({
            "product_name": prod.name if prod else "Unknown",
            "sku": prod.sku if prod else "-",
            "quantity": oi.quantity,
            "unit_price": oi.unit_price,
            "pieces_per_case": prod.pieces_per_case if prod else 1,
            "total_price": oi.quantity * oi.unit_price,
            "tax_rate": prod.tax_rate if prod else 0.0
        })

    return {
        "invoice": inv,
        "order": order,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "items": items_out
    }

@protected_router.get("/ledger")
def get_ledger(db: Session = Depends(get_db)):
    return db.query(models.Ledger).order_by(models.Ledger.id.desc()).all()

@protected_router.get("/stats")
def get_stats(days: Optional[int] = Query(None), start: Optional[str] = Query(None), end: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(models.Ledger)
    
    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.filter(models.Ledger.created_at >= cutoff)
    elif start and end:
        start_date = datetime.strptime(start, "%Y-%m-%d")
        end_date = datetime.strptime(end, "%Y-%m-%d") + timedelta(days=1)
        query = query.filter(models.Ledger.created_at >= start_date, models.Ledger.created_at < end_date)
        
    total_rev = query.filter(models.Ledger.transaction_type == "revenue").with_entities(func.sum(models.Ledger.amount)).scalar() or 0
    total_tax = query.filter(models.Ledger.transaction_type == "tax").with_entities(func.sum(models.Ledger.amount)).scalar() or 0
    total_exp = query.filter(models.Ledger.transaction_type == "expense").with_entities(func.sum(models.Ledger.amount)).scalar() or 0
    
    unpaid = db.query(models.Invoice).filter(models.Invoice.status == "unpaid").count()
    low_stock = db.query(models.Product).filter(models.Product.stock_quantity < 5).count()
    
    return {
        "revenue": total_rev,
        "tax": total_tax,
        "expense": total_exp,
        "profit": total_rev - total_exp,
        "unpaid_invoices": unpaid,
        "low_stock_alerts": low_stock
    }

app.include_router(protected_router)
