"""empty message

Revision ID: eca5afb59ab8
Revises: 765c8f6fb137
Create Date: 2023-12-14 17:13:20.714210

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eca5afb59ab8'
down_revision = '765c8f6fb137'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('picture', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category', sa.String(length=50), nullable=False, server_default='fullLength'))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('picture', schema=None) as batch_op:
        batch_op.drop_column('category')

    # ### end Alembic commands ###
