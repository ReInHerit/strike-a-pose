"""Add registered

Revision ID: d79537a427fd
Revises: 8da85d86db32
Create Date: 2023-12-13 17:19:24.615035

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd79537a427fd'
down_revision = '8da85d86db32'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('registered', sa.Boolean(), nullable=True))
        batch_op.alter_column('id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.Integer(),
               existing_nullable=False,
               autoincrement=True)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('id',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False,
               autoincrement=True)
        batch_op.drop_column('registered')

    # ### end Alembic commands ###
