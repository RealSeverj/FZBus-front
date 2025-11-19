from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db


class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    id = db.Column(db.Integer, primary_key=True)
    plate_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    capacity = db.Column(db.Integer, nullable=False, default=40)
    model = db.Column(db.String(50))
    in_service = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime, nullable=False)
    # 关联: schedules
    schedules = db.relationship('Schedule', back_populates='vehicle', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'plate_number': self.plate_number,
            'capacity': self.capacity,
            'model': self.model,
            'in_service': self.in_service,
            'created_at': self.created_at.isoformat(),
        }


class Employee(db.Model):
    __tablename__ = 'employees'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(30), nullable=False)  # 司机/调度等
    phone = db.Column(db.String(20), unique=True)
    hire_date = db.Column(db.Date, nullable=False, default=date.today)
    active = db.Column(db.Boolean, default=True, nullable=False)
    schedules = db.relationship('Schedule', back_populates='employee', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'role': self.role,
            'phone': self.phone,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'active': self.active,
        }


class Route(db.Model):
    __tablename__ = 'routes'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)  # 线路编号
    name = db.Column(db.String(100), nullable=False)
    origin = db.Column(db.String(100), nullable=False)
    destination = db.Column(db.String(100), nullable=False)
    distance_km = db.Column(db.Float)
    active = db.Column(db.Boolean, default=True, nullable=False)
    schedules = db.relationship('Schedule', back_populates='route', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'origin': self.origin,
            'destination': self.destination,
            'distance_km': self.distance_km,
            'active': self.active,
        }


class Schedule(db.Model):
    __tablename__ = 'schedules'
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=False)
    departure_time = db.Column(db.DateTime, nullable=False)
    arrival_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='scheduled', nullable=False)  # scheduled/running/completed/cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    vehicle = db.relationship('Vehicle', back_populates='schedules')
    employee = db.relationship('Employee', back_populates='schedules')
    route = db.relationship('Route', back_populates='schedules')

    def to_dict(self):
        return {
            'id': self.id,
            'vehicle_id': self.vehicle_id,
            'employee_id': self.employee_id,
            'route_id': self.route_id,
            'departure_time': self.departure_time.isoformat() if self.departure_time else None,
            'arrival_time': self.arrival_time.isoformat() if self.arrival_time else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
        }


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
        }

