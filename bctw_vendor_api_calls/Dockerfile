FROM python:3

ENV FLASK_APP app.py

WORKDIR /usr/src/app

COPY bctw_vendor_api_calls/requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["flask", "run", "--host=0.0.0.0"]

EXPOSE 5000