const express=require('express');
const cors=require('cors');
const mongoose=require("mongoose");
const User=require('./models/User');
const Post=require('./models/Post')
const bcrypt =require('bcryptjs');
const app=express();
const jwt=require('jsonwebtoken');
const cookieParser=require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');


const salt = bcrypt.genSaltSync(10);
const secret='asadssfsdfdggfhhjyyyttrre';

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect('mongodb+srv://blog:LfVZvC2xBPTa6Hrg@cluster0.gav8f0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')


app.post('/register', async (req,res)=>{
  const {username,password}=req.body;
  try{
    const userDoc=await User.create({username,
      password: bcrypt.hashSync(password,salt),
    });
  res.json(userDoc);
  }catch(e){
    console.log(e);
    res.status(400).json(e);
  }
 
});

app.post('/login',async(req,res) =>{
  const {username,password}=req.body;
  const userDoc=await User.findOne({username});
  const passOk=bcrypt.compareSync(password, userDoc.password);
  if(passOk){
    //logged in
    jwt.sign({username,id:userDoc._id}, secret ,{},(err,token)=>{
      if(err) throw err;
      res.cookie('token',token).json({id:userDoc._id,
        username,
    });
    });   
  } else {
    res.status(400).json('Wrong credentials');
  }
});

app.get('/profile',(req,res)=>{
  const {token} =req.cookies;

  //chatgpt added
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  // chatgpt ended
  
  jwt.verify(token, secret, {}, (err,info)=>{
    if (err) throw err;
    res.json(info);
  });
});

app.post('/logout',(req,res)=>{
res.cookie('token','').json('ok');
});

//chatgpt added
app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const {originalname,path} = req.file;
//chatgpt end
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });

});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;

  try {
    // Only process file if it exists
    if (req.file) {
      const { originalname, path } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = path + '.' + ext;
      fs.renameSync(path, newPath);
    }

    const { token } = req.cookies;

    // Verify JWT Token
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });

      const { id, title, summary, content } = req.body;
      const postDoc = await Post.findById(id);

      const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(403).json({ error: 'You are not the author' });
      }

      // Update the post
      await postDoc.updateOne({
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      });

      res.json(postDoc);
    });

  } catch (err) {
    console.error("Error in PUT /post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})

app.listen(4000);
//LfVZvC2xBPTa6Hrg

//mongodb+srv://blog:LfVZvC2xBPTa6Hrg@cluster0.gav8f0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

//"mongodb+srv://blog:LfVZvC2xBPTa6Hrg@cluster0.gav8f0m.mongodb.net/?appName=Cluster0";

// mongodb+srv://blog:LfVZvC2xBPTa6Hrg@cluster0.gav8f0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

