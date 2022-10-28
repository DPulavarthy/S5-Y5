FROM node:latest
WORKDIR /home/s5y5
COPY package.json .
RUN npm install
CMD ["npm", "start"]