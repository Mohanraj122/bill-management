from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    mobile = Column(String, nullable=True, unique=True) # Used for mobile login
    hashed_password = Column(String, nullable=True) # Used for local sub accounts
    google_id = Column(String, nullable=True, unique=True) # Used for master owner
    role = Column(String, default="staff") # admin or staff
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String)

class CustomerProductPrice(Base):
    __tablename__ = "customer_product_prices"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    custom_price = Column(Float)
    
    customer = relationship("Customer")
    product = relationship("Product")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    
    # Wholesale vs Retail
    pieces_per_case = Column(Integer, default=1)
    case_price = Column(Float, default=0.0)
    piece_price = Column(Float, default=0.0)
    
    tax_rate = Column(Float, default=0.18) 
    stock_quantity = Column(Integer, default=0) # ALWAYS represents total Pieces

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    walk_in_name = Column(String, nullable=True)
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="pending") 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    items = relationship("OrderItem", back_populates="order")
    invoice = relationship("Invoice", back_populates="order", uselist=False)
    customer = relationship("Customer")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer) # Always pieces
    unit_price = Column(Float) # Calculated final price per piece applied
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    total_amount = Column(Float)
    gst_amount = Column(Float)
    status = Column(String, default="unpaid") 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    order = relationship("Order", back_populates="invoice")

class Ledger(Base):
    __tablename__ = "ledger"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    transaction_type = Column(String) 
    reference_id = Column(String) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")
    vendor = relationship("Vendor")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer) # Recorded in Pieces logically
    unit_cost = Column(Float) # Cost per Piece
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")
