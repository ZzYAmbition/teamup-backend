const MongoClient = require('mongodb').MongoClient;
const Config = require('./config.js');
class DB {
  static getInstance() { // 单例模式
    if(!DB.instance) {
      DB.instance = new DB();
    }
    return DB.instance;
  }
  constructor() {
    this.dbClient = null;
    this.connect();
  }
  connect() { // 连接数据库
    return new Promise((resolve, reject) => {
      if(!this.dbClient) { // 数据库多次连接
        MongoClient.connect(Config.dbUrl, {useUnifiedTopology: true}, (err, client) => {
          if(err) {
            reject(err);
          } else {
            let db = client.db(Config.dbName);
            this.dbClient = db;
            resolve(this.dbClient);
          }
        })
      } else {
        resolve(this.dbClient);
      }
    })
  }
  find(collectionName, json) {
    return new Promise((resolve, reject) => {
      this.connect().then(db => {
        let result = db.collection(collectionName).find(json);
        result.toArray((err, docs) => {
          if(err) {
            reject(err);

          } else {
            resolve(docs);
          }
        })
      })
    })
  }
  insert(collectionName, json) {
    return new Promise((resolve, reject) => {
      this.connect().then(db => {
        db.collection(collectionName).insertOne(json, (err, data) => {
          if(err) {
            reject(err);
          } else {
            resolve(data);
          }
        })
      })
    })
  }
  update(collectionName, json) {
    return new Promise((resolve, reject) => {
      this.connect().then(db => {
        db.collection(collectionName).updateOne(json.wherestr, json.userInfo, (err, res) => {
          if(err) {
            reject(err);
          } else {
            resolve(res);
          }
        })
      })
    })
  }
  updateOne(collectionName, json) {
    return new Promise((resolve, reject) => {
      this.connect().then(db => {
        db.collection(collectionName).updateOne(json.wherestr, json.replyJson, (err, res) => {
          if(err) {
            reject(err);
          } else {
            resolve(res);
          }
        })
      })
    })
  }
  updateMany(collectionName, json) {
    return new Promise((resolve, reject) => {
      this.connect().then(db => {
        db.collection(collectionName).updateMany(json.condition, json.postUpdate, (err, res) => {
          if(err) {
            reject(err);
          } else {
            resolve(res);
          }
        })
      })
    })
  }
  delete(collectionName, json) {
    return new Promise((resolve, reject) => {
      this.connect().then(db => {
        db.collection(collectionName).deleteOne(json, (err, res) => {
          if(err) {
            reject(err);
          } else {
            resolve(res);
          }
        })
      })
    })
  }
}
module.exports = {
  DB
} 