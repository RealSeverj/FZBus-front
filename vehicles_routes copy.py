from flask import Blueprint, request, jsonify
from ..extensions import db
from ..auth_utils import admin_required
from ..models import Vehicle

vehicles_bp = Blueprint('vehicles', __name__)


@vehicles_bp.get('/')
def list_vehicles():
    query = Vehicle.query
    in_service = request.args.get('in_service')
    if in_service is not None:
        query = query.filter(Vehicle.in_service == (in_service.lower() == 'true'))
    items = [v.to_dict() for v in query.order_by(Vehicle.id.desc()).all()]
    return jsonify(items)


@vehicles_bp.post('/')
@admin_required
def create_vehicle():
    data = request.get_json() or {}
    required = ['plate_number']
    for r in required:
        if r not in data:
            return jsonify({'error': f'missing field {r}'}), 400
    vehicle = Vehicle(
        plate_number=data['plate_number'],
        capacity=data.get('capacity', 40),
        model=data.get('model'),
        in_service=data.get('in_service', True),
    )
    db.session.add(vehicle)
    db.session.commit()
    return jsonify(vehicle.to_dict()), 201


@vehicles_bp.get('/<int:vehicle_id>')
def get_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    return jsonify(vehicle.to_dict())


@vehicles_bp.put('/<int:vehicle_id>')
@admin_required
def update_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    data = request.get_json() or {}
    for field in ['plate_number', 'capacity', 'model', 'in_service']:
        if field in data:
            setattr(vehicle, field, data[field])
    db.session.commit()
    return jsonify(vehicle.to_dict())


@vehicles_bp.delete('/<int:vehicle_id>')
@admin_required
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({'deleted': True})
