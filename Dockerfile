FROM nginx
RUN apt-get update && apt-get dist-upgrade -y
COPY index.html /usr/share/nginx/html/index.html
COPY index.js /usr/share/nginx/html/index.js
