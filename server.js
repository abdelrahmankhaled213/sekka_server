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



app.post("/create-post", async (req, res) => {
  try {

    const { user_id, title, description, type, category, station_name } = req.body;
    
    const { data, error } = await supabase
      .from("posts") 
      .insert([
        {
          user_id,
          title,
          description,
          type,
          category,
          station_name,
          is_active: true,
          created_at: new Date(),
        }
      ])
      .select()
      .single();

    if (error) throw error;

    const message = {
      notification: {
        title: `New ${type} item!`,
        body: `${title} at ${station_name}`,
      },

      topic: "posts", 
      data: {
        postId: data.id.toString(),
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    };

    await admin.messaging().send(message);

    res.json({
      success: true,
      message: "Post created and notification sent! 🚀",
      data: data
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/get-posts", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        users (
          name,
          image
        ),
        comments (count) 
      `) 
      .order("created_at", { ascending: false });

    if (error) throw error;

    
    res.json({
      success: true,
      data: data,
    });
  } catch (e) {
    console.error("Error fetching posts:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/get_posts/:id",async(req,res)=>{

const {id}=req.params;

try{

  const { data, error } = await supabase
  .from("posts")
  .select(`
    *,
    users ( 
      name,
      image
    ),
    comments (
      content,
      created_at,
      user_id,
      users ( 
        name,
        image
      )
    )
  `)
  .eq("id", id)
  .single();
  if(error) throw error;
  res.json(data);
}catch(e){
  console.error(e);
  res.status(500).json({error:e.message});
}


} 

)


app.get("/get-post-comments/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        user_id,
        users ( 
          name,
          image
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true }); 

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/create-comment", async (req, res) => {
  try {
    const { user_id, post_id, content } = req.body;

    const { data, error } = await supabase.from("comments").insert([
      {
        user_id,
        post_id,
        content,
        created_at: new Date(),
      },
    ]);

    if (error) throw error;

    const message = {
      notification: {
        title: "New comment!",
        body: content,
      },
      topic: "comments",
      data:{
        postId: post_id,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      }
    }

    await admin.messaging().send(message);
    
    res.json({
      success: true,
      message: "Comment created successfully! 🚀",
      data: data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/delete-comment/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;

    const { data, error } = await supabase.from("comments").delete().eq("id", commentId);

    if (error) throw error;

res.json({
  success: true,
  message: "Comment deleted successfully! 🚀",
  data: data,
});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/update-comment/:commentId", async (req, res) => {

  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const { data, error } = await supabase.from("comments").update({ content }).eq("id", commentId);

    if (error) throw error;

    res.json({
      success: true,
      message: "Comment updated successfully! 🚀",
      data: data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/send-message", async (req, res) => {
  try {
    const { conversation_id, sender_id, text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }

    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert([{
        conversation_id,
        sender_id,
        text: text.trim(),
      }])
      .select()
      .single();

    if (msgError) throw msgError;


    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("user1_id, user2_id")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convError || !conversation) throw new Error("Conversation not found");

    const receiver_id = conversation.user1_id === sender_id
      ? conversation.user2_id
      : conversation.user1_id;

    const { data: receiverData } = await supabase
      .from("user_devices")
      .select("token, current_chat_id")
      .eq("user_id", receiver_id)
      .maybeSingle();

    if (receiverData?.token && receiverData?.current_chat_id !== conversation_id) {
      await admin.messaging().send({
        notification: {
          title: "New message",
          body: text.trim(),
        },
        token: receiverData.token,
        data: {
          conversation_id: conversation_id.toString(),
          sender_id: sender_id.toString(),
        },
      });
    }

    res.json({
      success: true,
      message: "Message sent successfully!",
      data: message,
    });

  } catch (e) {
    console.error("Server Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.put("/mark-messages-read/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { userId } = req.body; 

  try {
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false)
      .neq("sender_id", userId); 

    if (error) throw error;
    res.status(200).json({ message: "Messages marked as read" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


const PORT = process.env.PORT || 3000;


app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});
