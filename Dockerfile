FROM ubuntu:16.04

RUN  echo "deb http://archive.ubuntu.com/ubuntu xenial main universe\n" > /etc/apt/sources.list \
  && echo "deb http://archive.ubuntu.com/ubuntu xenial-updates main universe\n" >> /etc/apt/sources.list \
  && echo "deb http://security.ubuntu.com/ubuntu xenial-security main universe\n" >> /etc/apt/sources.list

ENV DEBIAN_FRONTEND=noninteractive \
    DEBCONF_NONINTERACTIVE_SEEN=true

RUN apt-get -qqy update \
  && apt-get -qqy --no-install-recommends install \
  curl \
  xvfb \
  bzip2 \
  ca-certificates \
  apt-transport-https \
  openjdk-8-jre-headless \
  tzdata \
  sudo \
  unzip \
  wget \
  libfontconfig \
  libfreetype6 \
  xfonts-cyrillic \
  xfonts-scalable \
  fonts-liberation \
  fonts-ipafont-gothic \
  fonts-wqy-zenhei \
  fonts-tlwg-loma-otf \
  ttf-ubuntu-font-family \
  supervisor \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && sed -i 's/securerandom\.source=file:\/dev\/random/securerandom\.source=file:\/dev\/urandom/' ./usr/lib/jvm/java-8-openjdk-amd64/jre/lib/security/java.security

RUN wget -qO- https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs default-jre

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get update
RUN apt-get install google-chrome-stable -y

RUN mkdir -p /tmp/reports/screenshots
RUN mkdir /tmp/reports/lighthouse_pages
RUN mkdir /tmp/reports/frame
RUN mkdir /tmp/tests

COPY tests /tests
ADD	supervisord.conf /etc/supervisor/conf.d/supervisord.conf
ADD package.json /tests/package.json
ADD start_test.sh /tmp/start_test.sh
ADD ExampleTest.yaml /tmp/tests/ExampleTest.yaml
ADD Feeder.yaml /tmp/tests/Feeder.yaml

RUN chmod +x /tmp/start_test.sh
WORKDIR /tests

ENV DISPLAY :20
ENV SCREEN_GEOMETRY "1440x900x24"
RUN npm install --save-dev

ENTRYPOINT ["/tmp/start_test.sh"]
