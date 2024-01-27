FROM nginx
RUN rm -rf /usr/share/nginx/html/*
COPY ./ /usr/share/nginx/html/
RUN ln -s /usr/share/nginx/html/main.html /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

