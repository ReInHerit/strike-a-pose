from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField
from wtforms.validators import DataRequired, Email

class RegistrationForm(FlaskForm):
    email = StringField("Email", validators = [DataRequired("Email is required"), Email("Wrong email syntax")])
    password = PasswordField("Password", validators=[DataRequired("Password is required")])
    submit = SubmitField("Signup")

class LoginForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired("Email is required"), Email("Wrong email syntax")])
    password = PasswordField("Password", validators=[DataRequired("Password is required")])
    submit = SubmitField("Login")

class CreateRoomForm(FlaskForm):
    choices_n_pose = [
        (1,"One"),
        (2, "Two"),
        (3, "Three"),
        (4, "Four"),
        (5, "Five"),
        (6,"Six")
    ]

    choices_n_round = [
        (1,"One"),
        (2, "Two"),
        (3, "Three")
    ]

    n_round = SelectField("Choose number of rounds", choices=choices_n_round, validators=[DataRequired("Round number is required")])
    n_pose = SelectField("Choose number of poses", choices=choices_n_pose, validators=[DataRequired("Pose number is required")])
    submit = SubmitField("CREATE ROOM")

class JoinRoomForm(FlaskForm):
    room_id = StringField("Room ID", validators=[DataRequired("Room ID is required")])
    submit = SubmitField("ENTER")
