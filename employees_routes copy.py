from flask import Blueprint, request, jsonify
from ..extensions import db
from ..auth_utils import admin_required
from ..models import Employee

employees_bp = Blueprint('employees', __name__)


@employees_bp.get('/')
def list_employees():
    active = request.args.get('active')
    query = Employee.query
    if active is not None:
        query = query.filter(Employee.active == (active.lower() == 'true'))
    items = [e.to_dict() for e in query.order_by(Employee.id.desc()).all()]
    return jsonify(items)


@employees_bp.post('/')
@admin_required
def create_employee():
    data = request.get_json() or {}
    required = ['name', 'role']
    for r in required:
        if r not in data:
            return jsonify({'error': f'missing field {r}'}), 400
    employee = Employee(
        name=data['name'],
        role=data['role'],
        phone=data.get('phone'),
        active=data.get('active', True),
    )
    db.session.add(employee)
    db.session.commit()
    return jsonify(employee.to_dict()), 201


@employees_bp.get('/<int:employee_id>')
def get_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    return jsonify(employee.to_dict())


@employees_bp.put('/<int:employee_id>')
@admin_required
def update_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    data = request.get_json() or {}
    for field in ['name', 'role', 'phone', 'active']:
        if field in data:
            setattr(employee, field, data[field])
    db.session.commit()
    return jsonify(employee.to_dict())


@employees_bp.delete('/<int:employee_id>')
@admin_required
def delete_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    db.session.delete(employee)
    db.session.commit()
    return jsonify({'deleted': True})
