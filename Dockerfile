FROM node@sha256:e9af1806eba0b0c767e6adc1257eb8d1e78f88cbf89a0921f15f32bb01478322
WORKDIR /app
COPY . /app
RUN npm install
EXPOSE 1883
CMD [ "node", "index.js" ]
