FROM python:3-slim

WORKDIR /usr/src/app

COPY requirements.txt  ./

RUN apt update
RUN apt install ffmpeg libsm6 libxext6  -y

RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=${PORT:-5000}
EXPOSE ${PORT}

COPY ./back-end .

CMD gunicorn --bind 0.0.0.0:$PORT app:app
