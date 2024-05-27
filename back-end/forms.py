from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, FileField, TextAreaField
from wtforms.validators import DataRequired, Email, Optional
from models import Level
from flask import current_app


class CreateRoomForm(FlaskForm):
    choices_n_pose = [
        (1,"One"),
        (2, "Two"),
        (3, "Three"),
        (4, "Four"),
        # (5, "Five"),
        # (6, "Six")
    ]

    choices_n_round = [
        (1, "One"),
        (2, "Two"),
        (3, "Three")
    ]
    # choices_level = [
    #     (1, "Half Bust"),
    #     (2, "Full Body"),
    #     (3, "All")
    # ]
    choices_clients = [
        (1, "Solo"),
        (2, "Versus")
    ]
    # choices_level = []

    n_round = SelectField("Choose", choices=choices_n_round, validators=[DataRequired("Round number is required")])
    n_pose = SelectField("Choose", choices=choices_n_pose, validators=[DataRequired("Pose number is required")])
    levels = SelectField("Choose", choices=[], validators=[DataRequired("Level is required")])
    clients = SelectField("Choose", choices=choices_clients, validators=[DataRequired("Client number is required")])
    submit = SubmitField("CREATE ROOM")
    def set_level_choices(self):
        # Fetch choices dynamically from the Level model
        existing_levels = Level.query.all()
        self.levels.choices = [(level.id, level.name) for level in existing_levels]

class JoinRoomForm(FlaskForm):
    room_id = StringField("Room ID", validators=[DataRequired("Room ID is required")])
    submit = SubmitField("ENTER")


class ImageForm(FlaskForm):
    title = StringField('Title')
    image = FileField('Image')
    submit = SubmitField('Upload')


class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Submit')


class RegistrationForm(FlaskForm):
    username = StringField('username', validators=[DataRequired()])
    newEmail = StringField('newEmail', validators=[DataRequired(), Email("Please enter a valid email address")])
    newPassword = PasswordField('newPassword', validators=[DataRequired()])
    submit = SubmitField('Register')


class AddPictureForm(FlaskForm):
    author_name = StringField('Author Name', validators=[DataRequired()])
    artwork_name = StringField('Artwork Name', validators=[DataRequired()])
    image = FileField('Image', validators=[DataRequired()])
    category_type = SelectField('Category', choices=[('existing', 'Choose Existing'), ('new', 'Add New')],
                                validators=[DataRequired()])
    existing_category = SelectField('Existing Category', choices=[], validators=[Optional()])
    new_category = StringField('New Category', validators=[Optional()])
    description = TextAreaField('Description', render_kw={"rows": 5, "class": "form-control", "style": "resize: vertical"}, description="You can use HTML for formatting")

    submit = SubmitField('Add Picture')


# class RemovePictureForm(FlaskForm):
#     picture_id = SelectField('Select Picture to Remove', coerce=int, validators=[DataRequired()])
#     submit = SubmitField('Remove Picture')
