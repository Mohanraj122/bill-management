import models
from database import SessionLocal

db = SessionLocal()

# Check if data already exists
if db.query(models.Product).count() == 0:
    print("Seeding data...")
    # Add Products
    p1 = models.Product(sku="P001", name="Premium Widget", pieces_per_case=10, case_price=900.0, piece_price=100.0, tax_rate=0.18, stock_quantity=150)
    p2 = models.Product(sku="P002", name="Standard Gadget", pieces_per_case=24, case_price=2000.0, piece_price=100.0, tax_rate=0.12, stock_quantity=500)
    p3 = models.Product(sku="P003", name="Budget Thingamajig", pieces_per_case=50, case_price=2250.0, piece_price=50.0, tax_rate=0.05, stock_quantity=1000)
    db.add_all([p1, p2, p3])
    db.commit()

    # Add Customers
    c1 = models.Customer(name="Acme Corp", phone="555-0100")
    c2 = models.Customer(name="Globex Inc", phone="555-0200")
    db.add_all([c1, c2])
    db.commit()

    # Add Vendors
    v1 = models.Vendor(name="Global Supplies LLC")
    db.add(v1)
    db.commit()
    
    print("Sample data successfully added!")
else:
    print("Data already exists in database. Skipping seed.")

db.close()
