const express = require('express'); // express
const request = require('request');
const md5 = require('md5'); // md5
const ObjectId = require('mongodb').ObjectId;

const { WX_APPID, WX_APPSECRET, GRANT_TYPE_AUTHORIZATION_CODE } = require('./static/wxsource/wx.js');
const { OPENID_URL } = require('./static/url.js');
const { PRIVATE_KEY } = require('./static/private.js');
const DB = require('./module/db.js').DB;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 获取用户--小程序的openid
app.get('/getOpenid', (req, res) => {
  const code = req.query.code;
  console.log(code + new Date());
  let url = `${OPENID_URL}appid=${WX_APPID}&secret=${WX_APPSECRET}&js_code=${code}&grant_type=${GRANT_TYPE_AUTHORIZATION_CODE}`;
  request(url, (err, wxres, body) => {
    let bodyJson = JSON.parse(body);
    let openIdEncrypted = md5(bodyJson.openid);
    res.send(PRIVATE_KEY + openIdEncrypted)
  })
});

// 登录并获取用户信息
app.post('/login', (req, res) => {
  let userInfo = {
    openid: req.body.openid,
    username: req.body.username,
    gender: Number(req.body.gender),
    class: '',
    school: '',
    resume: '',
    avatarUrl: req.body.avatarUrl
  }
  let d = DB.getInstance();
  d.find('user', { openid: userInfo.openid }).then(docs => {
    if (docs.length === 1) {
      res.send(docs[0]);
    } else {
      d.insert('user', userInfo).then(data => {
        if (data.result.ok === 1) {
          res.send(userInfo);
        }
      })
    }
  })
});

// 获取用户信息
app.get('/queryInfo', (req, res) => {
  let d = DB.getInstance();
  d.find('user', req.query).then(docs => {
    if (docs.length === 1) {
      res.send(docs[0]);
    }
  })
});

// 修改用户信息
app.post('/updateInfo', (req, res) => {
  let userInfo = {
    $set: {
      username: req.body.username,
      gender: req.body.gender,
      class: req.body.class,
      school: req.body.school,
      resume: req.body.resume,
      avatarUrl: req.body.avatarUrl
    }
  }
  let wherestr = { openid: req.body.openid }
  let mergeJson = {
    userInfo,
    wherestr
  }
  let postUpdate = {
    $set: {
      'user.class': req.body.class,
      'user.school': req.body.school,
      'user.username': req.body.username
    }
  }
  let condition = {
    'user.openid': req.body.openid
  }
  let mergeJsonP = {
    postUpdate,
    condition
  }
  let d = DB.getInstance();
  d.update('user', mergeJson).then(docs => {
    if (docs.result.ok == 1) {
      d.updateMany('post', mergeJsonP).then(docsmany => {
        console.log(docsmany.result)
        if (docsmany.result.ok == 1) {
          res.send('更新成功');
        }
      })
    }
  })
});

// 发布帖子
app.get('/addpost', (req, res) => {
  let user = JSON.parse(req.query.user);
  let reply = JSON.parse(req.query.reply);
  console.log(user)
  console.log(reply)
  console.log(req.query)
  let post = {
    post_title: req.query.post_title,
    post_content: req.query.post_content,
    date: req.query.date,
    user,
    reply,
  }
  let d = DB.getInstance();
  d.insert('post', post).then(data => {
    if (data.result.ok === 1) {
      d.find('post', {}).then(docs => {
        res.send(docs);
      })
    }
  })
});

// 查询帖子
app.get('/querypost', (req, res) => {
  let d = DB.getInstance();
  d.find('post', {}).then(docs => {
    res.send(docs);
  })
});

// 删除帖子
app.get('/delpost', (req, res) => {
  let d = DB.getInstance();
  let wherestr = {
    _id: ObjectId(req.query._id)
  }
  d.delete('post', wherestr).then(docs => {
    if (docs.result.ok === 1) {
      d.find('post', {}).then(docs => {
        res.send({ docs, msg: '删除成功' });
      })
    }
  })
});

// 添加留言
app.get("/addreply", (req, res) => {
  let d = DB.getInstance();
  let replyObj = JSON.parse(req.query.replyObj);
  let wherestr = {
    _id: ObjectId(req.query.postId)
  }
  let replyJson = {
    $push: {
      reply: {
        openid: replyObj.openid,
        words: replyObj.words,
        school: replyObj.school,
        username: replyObj.username,
        date: replyObj.date,
        avatarUrl: replyObj.avatarUrl
      }
    }
  }
  let upJson = {
    replyJson,
    wherestr
  }
  console.log(replyJson, wherestr);
  d.updateOne('post', upJson).then(data => {
    if(data.result.nModified == 1) {
      d.find('post', wherestr).then(docs => {
        let post = docs[0];
        res.send({post, msg: '留言成功'});
      })
    }
  })
});

// 查询分类
app.get('/gettags', (req, res) => {
  let d = DB.getInstance();
  d.find('type', {}).then(docs => {
    res.send(docs);
  })
});

// 添加分类
app.get('/addtag', (req, res) => {
  let d = DB.getInstance();
  d.find('type', {tagname: req.query.tagname}).then(result => {
    if(result.length == 0) {
      d.insert('type', {tagname: req.query.tagname}).then(data => {
        if(data.result.ok === 1) {
          d.find('type', {}).then(docs => {
            let result = {
              tags: docs,
              msg: '添加分类成功'
            }
            res.send(result);
          })
        }
      });
    } else {
      let result = {
        tags: '没有',
        msg: '该标签已经存在'
      }
      res.send(result)
    }
  })
});

// 删除分类
app.get('/deletetag', (req, res) => {
  let d = DB.getInstance();
  let whereStr = {
    _id: ObjectId(req.query._id)
  }
  let wherestro = {
    'captain.openid': req.query.openid
  }
  d.delete('type', whereStr).then(docs => {
    d.delete('team', wherestro).then(resultt => {
      d.find('type', {}).then(data => {
        let result = {
          tags: data,
          msg: '删除成功'
        }
        res.send(result);
      });
    });
  })
});

// 创建队伍
app.get('/addteam', (req, res) => {
  let type = JSON.parse(req.query.type);
  let captain = JSON.parse(req.query.captain);
  let teammates = JSON.parse(req.query.teammates);
  let team = {
    teamtitle: req.query.teamtitle,
    declaration: req.query.declaration,
    isaward: req.query.isaward,
    date: req.query.date,
    contact: req.query.contact,
    captain,
    type,
    teammates,
    maxnum: Number(req.query.maxnum)
  }
  let d = DB.getInstance();
  d.insert('team', team).then(docs => {
    if(docs.result.ok === 1) {
      res.send('成功');
    }
  })
});

// 查询所有队伍
app.get('/queryteam', (req, res) => {
  let d = DB.getInstance();
  d.find('team', {}).then(docs => {
    res.send(docs);
  })
})

// 查询用户
app.get('/searchUser', (req, res) => {
  let d = DB.getInstance();
  let whereStr = {
    username: req.query.username
  }
  d.find('user', whereStr).then(docs => {
    if(docs.length == 0) {
      res.send([]);
    } else {
      res.send(docs);
    }
  })
})

// 添加队伍成员
app.get('/addmember', (req, res) => {
  let d = DB.getInstance();
  let wherestr = {
    _id: ObjectId(req.query.tid)
  }
  let member = JSON.parse(req.query.member);
  let replyJson = {
    $push: {
      teammates: {
        openid:member.openid,
        username: member.username,
        gender: member.gender,
        class: member.class,
        school: member.school,
        resume: member.resume,
        avatarUrl: member.avatarUrl
      }
    }
  }
  let upJson = {
    wherestr,
    replyJson
  }
  let qjson = {
    _id: ObjectId(req.query.tid),
    teammates: {
      $elemMatch: {
        openid:member.openid,
      }
    }
  }
  console.log(qjson);
  d.find('team', qjson).then(docs => {
    if(docs.length == 0) {
      d.updateOne('team', upJson).then(data => {
        if(data.result.nModified == 1) {
          res.send('添加成功');
        } else {
          res.send('添加失败');
        }
      })
    } else {
      res.send('成员已经存在');
    }
  })
});

// 删除队伍
app.get('/deleteteam', (req, res) => {
  let wherestr = {
    _id: ObjectId(req.query._id)
  }
  let d = DB.getInstance();
  d.delete('team', wherestr).then(docs => {
    res.send('删除成功');
  })
})

// 移除成员
app.get('/updateteam', (req, res) => {
  let team = req.query;
  let captain = JSON.parse(team.captain);
  let teammates = JSON.parse(team.teammates);
  let type = JSON.parse(team.type);
  let d = DB.getInstance();
  team.teammates = teammates;
  team.captain = captain;
  team.type = type;
  let wherestr = {
    _id: ObjectId(team._id)
  }
  let teamJson = {
    $set: {
      teamtitle: team.teamtitle,
      declaration: team.declaration,
      isaward: team.isaward,
      date: team.date,
      contact: team.contact,
      teammates: team.teammates
    }
  }
  let mergeJson = {
    wherestr,
    userInfo: teamJson
  }
  d.update('team', mergeJson).then(docs => {
    if(docs.result.ok == 1) {
      res.send('保存成功')
    }
  })
})

// 申请加入队伍
app.get('/applyteam', (req, res) => {
  let applicant = JSON.parse(req.query.applicant);
  let receiver = JSON.parse(req.query.receiver);
  let team = JSON.parse(req.query.team);
  let msg_type = req.query.msg_type;
  let msg = {
    applicant,
    receiver,
    team,
    msg_type
  }
  let d = DB.getInstance();
  d.find('msg', msg).then(docs => {
    if(docs.length > 0) {
      res.send('err');
    } else {
      d.insert('msg', msg).then(data => {
        if(data.result.ok == 1) {
          res.send('插入成功')
        }
      })
    }
  })
})

// 查询所有消息
app.get('/querymsg', (req, res) => {
  let receiverJson = {
    'receiver.openid': req.query.openid
  }
  console.log(receiverJson);
  let d = DB.getInstance();
  d.find('msg', receiverJson).then(docs => {
    console.log(docs);
    res.send(docs);
  })
})

// 删除消息
app.get('/deletemsg', (req, res) => {
  let wherestr = {
    _id: ObjectId(req.query.msg_id)
  }
  let receiverJson = {
    'receiver.openid': req.query.openid
  }
  let d = DB.getInstance();
  d.delete('msg', wherestr).then(data => {
    d.find('msg', receiverJson).then(docs => {
      res.send(docs);
    })
  })
})

// 按分类查询队伍
app.get('/queryteambytag', (req, res) => {
  let type = JSON.parse(req.query.type);
  console.log(type.tagname)
  let wherestr = {
    'type.tagname': type.tagname
  }
  let d = DB.getInstance();
  if(type.tagname == '全部') {
    d.find('team', {}).then(docs => {
      res.send(docs);
    })
  } else {
    d.find('team', wherestr).then(docs => {
      res.send(docs);
    })
  }
});

//  我的队伍
app.get('/querymyteam', (req, res) => {
  let openid = req.query.openid;
  let wherestr = {
    $or: [
      {"captain.openid": openid},
      {
        teammates: {
          $elemMatch: {
            openid: openid,
          }
        }
      }
    ]
  }
  let d = DB.getInstance();
  d.find('team', wherestr).then(docs => {
    console.log(docs);
    res.send(docs);
  })
})
app.listen(3000);
console.log('服务器启动成功');