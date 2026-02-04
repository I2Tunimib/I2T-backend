FROM node:20-slim

# Install Python 3.10, pip, venv, and zip
RUN apt-get update && \
    apt-get install -y \
    zip \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN DISABLE_ESLINT_PLUGIN=true npm install --production

COPY . .

# Create virtual environment and install Python dependencies
RUN python3 -m venv venv && \
    ./venv/bin/pip install --upgrade pip setuptools wheel && \
    ./venv/bin/pip install pandas spacy column-classifier && \
    ./venv/bin/python3 -m spacy download en_core_web_sm && \
    echo "Verifying spacy model installation..." && \
    ./venv/bin/python3 -c "import spacy; spacy.load('en_core_web_sm'); print('✓ en_core_web_sm loaded successfully')"

# Make the Python script executable
RUN chmod +x py-scripts/column_classifier_runner.py

# explicitly tell docker to copy .env file or it won't be copied to image
# COPY .env .

EXPOSE 3004
CMD [ "npm", "run", "start-prod" ]
