const fetch = (...args) =>
  import('node-fetch').then(({default: fetch}) => fetch(...args));
global.fetch = fetch;
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

require("dotenv").config()

const serviceAccount = JSON.parse(process.env.FirebaseServiceAccount);

const { createClient } = require("@supabase/supabase-js")

const supabase= createClient(
  process.env.SUPABASE_URL
  , process.env.SUPABASE_KEY);


  console.log("URL:", process.env.SUPABASE_URL);
console.log("KEY:", process.env.SUPABASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();


app.get("/", (req, res) => {
  
  res.send("dah hosting free 🚀");

});

app.post("/test-notification"
  ,async(req,res)=>{

  const {token,title,body}=req.body;
  try{
    await sendNotification(
      token
      ,title
      ,body,
    );

    res.json({ success: true, message: "Notification sent successfully" });
  }catch(e){
    res.status(500).json({ error: e.message });
  }

});



async function sendNotification(token,title, body) {

  const message = {
   notification:{
    title:title,
    body:body
   },
   token:token
  }
  try {
    await admin.messaging().send(message);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
  }

}

app.post("/save-token", async (req, res) => {
  try {
    const { user_id, token, device_type } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

   
    const { data, error } = await supabase
     
        .from("user_devices")
      .upsert(
        {

          user_id: user_id ?? null,
          token: token,
          device_type: device_type ?? "android",
        },
         
      { onConflict: "token" }
 

      );

    if (error) throw error;

    res.json({
      success: true,
      message: "Token saved successfully 🚀",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase.from("user_devices").select("*");
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/create-post", async (req, res) => {
  try {
    const { user_id, title, description, station_name, type, category } = req.body;

    // Awal khatawa: el-Insert (w n-esta5dem .select().single() 3ashan el ID)
    const { data, error } = await supabase
      .from("posts")
      .insert({ 
        user_id, 
        title, 
        description, 
        station_name, 
        type, 
        category, 
        is_active: true 
      })
      .select()
      .single();

    if (error) throw error; // Law feh moshkela fel DB mesh haykamel lel notification

    // Tany khatawa: N-nady el Topic ba3d ma el insert nege7
    const message = {
      notification: {
        title: `حاجة ${type == 'lost' ? 'ضاعت' : 'لقيناها'} جديدة! 📢`,
        body: `${title} في محطة ${station_name}`,
      },
      topic: "posts", // Dah el esm elly el-nas kollo moshtarek feeh
      data: {
        postId: data.id.toString(), // Ba3atna el ID el gdid elly lssa rag3 elhalan
        type: type,
      },
    };

    await admin.messaging().send(message);

    res.json({ success: true, postId: data.id });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});