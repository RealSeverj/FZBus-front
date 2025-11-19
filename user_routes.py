from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest, Unauthorized
from flask_jwt_extended import create_access_token

from ..extensions import db
from ..models import User
from ..auth_utils import admin_required


user_bp = Blueprint('users', __name__)


@user_bp.post('/login')
def login():
	"""用户登录接口，成功后签发 JWT access token.

	请求体(JSON):
		{
			"username": "admin",
			"password": "xxx"
		}

	响应:
		200 OK: {"access_token": "...", "user": {...}}
		400 Bad Request: 参数错误
		401 Unauthorized: 用户不存在或密码错误
	"""

	if not request.is_json:
		raise BadRequest('请求体必须为 JSON')

	data = request.get_json(silent=True) or {}
	username = data.get('username')
	password = data.get('password')

	if not username or not password:
		raise BadRequest('username 和 password 为必填字段')

	# 允许任意存在的用户登录，角色通过 is_admin 区分
	user: User | None = User.query.filter_by(username=username).first()
	if user is None or not user.check_password(password):
		# 不区分具体错误，避免暴露信息
		raise Unauthorized('用户名或密码错误')

	# 使用 JWT 生成访问令牌，identity 存用户ID，claims 中带上角色信息
	access_token = create_access_token(identity=user.id, additional_claims={
		'username': user.username,
		'is_admin': user.is_admin,
	})

	return jsonify({
		'access_token': access_token,
		'user': user.to_dict(),
	}), 200


@user_bp.post('/')
@admin_required
def create_user():
	"""管理员创建用户接口.

	仅管理员可调用，用于创建普通用户或新的管理员。

	请求体(JSON):
		{
			"username": "user1",
			"password": "xxx",
			"is_admin": false   # 可选，默认 false
		}

	响应:
		201 Created: 新建用户信息（不含密码）
		400 Bad Request: 参数缺失或用户名已存在
	"""

	data = request.get_json(silent=True) or {}
	username = data.get('username')
	password = data.get('password')
	is_admin = bool(data.get('is_admin', False))

	if not username or not password:
		return jsonify({'error': 'username 和 password 为必填字段'}), 400

	# 检查是否重名
	if User.query.filter_by(username=username).first() is not None:
		return jsonify({'error': 'username 已存在'}), 400

	user = User(username=username, is_admin=is_admin)
	user.set_password(password)
	
	db.session.add(user)
	db.session.commit()

	return jsonify(user.to_dict()), 201

