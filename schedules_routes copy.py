from datetime import datetime
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..auth_utils import admin_required
from ..models import Schedule, Vehicle, Employee, Route

schedules_bp = Blueprint('schedules', __name__)


@schedules_bp.get('/')
def list_schedules():
    status = request.args.get('status')
    query = Schedule.query
    if status:
        query = query.filter(Schedule.status == status)
    items = [s.to_dict() for s in query.order_by(Schedule.id.desc()).all()]
    return jsonify(items)


@schedules_bp.post('/')
@admin_required
def create_schedule():
    data = request.get_json() or {}
    required = ['vehicle_id', 'employee_id', 'route_id', 'departure_time']
    for r in required:
        if r not in data:
            return jsonify({'error': f'missing field {r}'}), 400
    # 验证外键存在
    for model, key in [(Vehicle, 'vehicle_id'), (Employee, 'employee_id'), (Route, 'route_id')]:
        if not model.query.get(data[key]):
            return jsonify({'error': f'invalid {key}'}), 400
    try:
        departure_time = datetime.fromisoformat(data['departure_time'])
    except Exception:
        return jsonify({'error': 'invalid departure_time, use ISO format'}), 400
    arrival_time = None
    if data.get('arrival_time'):
        try:
            arrival_time = datetime.fromisoformat(data['arrival_time'])
        except Exception:
            return jsonify({'error': 'invalid arrival_time, use ISO format'}), 400
    schedule = Schedule(
        vehicle_id=data['vehicle_id'],
        employee_id=data['employee_id'],
        route_id=data['route_id'],
        departure_time=departure_time,
        arrival_time=arrival_time,
        status=data.get('status', 'scheduled'),
    )
    db.session.add(schedule)
    db.session.commit()
    return jsonify(schedule.to_dict()), 201


@schedules_bp.get('/<int:schedule_id>')
def get_schedule(schedule_id):
    schedule = Schedule.query.get_or_404(schedule_id)
    return jsonify(schedule.to_dict())


@schedules_bp.put('/<int:schedule_id>')
@admin_required
def update_schedule(schedule_id):
    schedule = Schedule.query.get_or_404(schedule_id)
    data = request.get_json() or {}
    if 'departure_time' in data:
        try:
            schedule.departure_time = datetime.fromisoformat(data['departure_time'])
        except Exception:
            return jsonify({'error': 'invalid departure_time'}), 400
    if 'arrival_time' in data:
        try:
            schedule.arrival_time = datetime.fromisoformat(data['arrival_time'])
        except Exception:
            return jsonify({'error': 'invalid arrival_time'}), 400
    for field in ['vehicle_id', 'employee_id', 'route_id', 'status']:
        if field in data:
            setattr(schedule, field, data[field])
    db.session.commit()
    return jsonify(schedule.to_dict())


@schedules_bp.delete('/<int:schedule_id>')
@admin_required
def delete_schedule(schedule_id):
    schedule = Schedule.query.get_or_404(schedule_id)
    db.session.delete(schedule)
    db.session.commit()
    return jsonify({'deleted': True})
