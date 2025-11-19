from flask import Blueprint, request, jsonify
from ..extensions import db
from ..auth_utils import admin_required
from ..models import Route

routes_bp = Blueprint('routes', __name__)


@routes_bp.get('/')
def list_routes():
    active = request.args.get('active')
    query = Route.query
    if active is not None:
        query = query.filter(Route.active == (active.lower() == 'true'))
    items = [r.to_dict() for r in query.order_by(Route.id.desc()).all()]
    return jsonify(items)


@routes_bp.post('/')
@admin_required
def create_route():
    data = request.get_json() or {}
    required = ['code', 'name', 'origin', 'destination']
    for r in required:
        if r not in data:
            return jsonify({'error': f'missing field {r}'}), 400
    route = Route(
        code=data['code'],
        name=data['name'],
        origin=data['origin'],
        destination=data['destination'],
        distance_km=data.get('distance_km'),
        active=data.get('active', True),
    )
    db.session.add(route)
    db.session.commit()
    return jsonify(route.to_dict()), 201


@routes_bp.get('/<int:route_id>')
def get_route(route_id):
    route = Route.query.get_or_404(route_id)
    return jsonify(route.to_dict())


@routes_bp.put('/<int:route_id>')
@admin_required
def update_route(route_id):
    route = Route.query.get_or_404(route_id)
    data = request.get_json() or {}
    for field in ['code', 'name', 'origin', 'destination', 'distance_km', 'active']:
        if field in data:
            setattr(route, field, data[field])
    db.session.commit()
    return jsonify(route.to_dict())


@routes_bp.delete('/<int:route_id>')
@admin_required
def delete_route(route_id):
    route = Route.query.get_or_404(route_id)
    db.session.delete(route)
    db.session.commit()
    return jsonify({'deleted': True})
