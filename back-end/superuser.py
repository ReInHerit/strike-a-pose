from app import app, db
from models import User
with app.app_context():
    # Create a superuser
    superuser = User(
        username='superadmin',
        email='superadmin@example.com',  # Set a unique and non-null email
        is_superuser=True,
        registered=True,
        confirmed=True,
    )
    superuser.set_password('superadminpassword')
    existing_user = User.query.filter_by(username=superuser.username).first()

    if existing_user is None:
        # Add the superuser to the database
        db.session.add(superuser)
        db.session.commit()
        print('Superuser created')
    else:
        print('Superuser already exists')
