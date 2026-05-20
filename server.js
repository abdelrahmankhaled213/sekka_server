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
    // 1. Destructure the exact fields coming from your Flutter client
    const { 
      conversation_id, 
      sender_id, 
      text, 
      message_type, 
      file_url 
    } = req.body;

    // 2. Fix Validation: Only enforce non-empty text if it's a standard text message
    const isTextMsg = !message_type || message_type === "text";
    if (isTextMsg && (!text || text.trim() === "")) {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }

    // 3. Clean Insert: Save the clean data to your Supabase table
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert([{
        conversation_id,
        sender_id,
        text: text ? text.trim() : "", 
        message_type: message_type || "text",
        file_url, // Saves the storage bucket link directly here
      }])
      .select()
      .single();

    if (msgError) throw msgError;

    // 4. Fetch the conversation to determine who the receiver is
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("user1_id, user2_id")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convError || !conversation) throw new Error("Conversation not found");

    const receiver_id = conversation.user1_id === sender_id
      ? conversation.user2_id
      : conversation.user1_id;

    // 5. Look up the receiver's push notification token
    const { data: receiverData } = await supabase
      .from("user_devices")
      .select("token, current_chat_id")
      .eq("user_id", receiver_id)
      .maybeSingle();

    // 6. Push Notification Logic: Customize the body if it's a media message
    if (receiverData?.token && receiverData?.current_chat_id !== conversation_id) {
      let notificationBody = text ? text.trim() : "";
      
      // If text is blank because it's a pure image upload, set a clean fallback notification text
      if (message_type === "image" && !notificationBody) {
        notificationBody = "📷 Sent an image";
      } else if (message_type && message_type !== "text" && !notificationBody) {
        notificationBody = "📁 Sent a file";
      }

      await admin.messaging().send({
        notification: {
          title: "New message",
          body: notificationBody,
        },
        token: receiverData.token,
        data: {
          conversation_id: conversation_id.toString(),
          sender_id: sender_id.toString(),
        },
      });
    }

    // 7. Respond back to Flutter with the newly created database record
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


app.put("/update-message/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text, sender_id } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .update({ text: text.trim(), is_edited: true })
      .eq("id", messageId)
      .eq("sender_id", sender_id) 
      .select()
      .single();

    if (error) throw error;
    if (!message) return res.status(404).json({ error: "Message not found." });

    res.json({ success: true, data: message });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/delete-message/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { sender_id } = req.body;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", sender_id);

    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});


app.post("/trips", async (req, res) => {

const{start_station_id, end_station_id, fcm_token} = req.body;

if (!start_station_id || !end_station_id) {
            return res.status(400).json({ 
                error: "start_station_id and end_station_id are required." 
            });
        }


        let formattedStatus = 'active';
        if (req.body.status && req.body.status.includes('.')) {
            formattedStatus = req.body.status.split('.').last || 'active'; 
            formattedStatus = req.body.status.replace('TripStatus.', '');
        }

const { data: newTrip, error: tripError } = await supabase
            .from('trips')
            .insert([
                {
                    start_station_id: parseInt(start_station_id),
                    end_station_id: parseInt(end_station_id),    
                    status: formattedStatus,
                    date: date || new Date().toISOString(),
                  
                }
            ])
            .select() 
            .single();

        if (tripError) {
            throw tripError;
        }
        return res.status(201).json({ 
            message: "Trip started successfully",
            id: newTrip.id 
        });

  });



  app.put("/trips/:tripId/completed", async (req, res) => {
    try {
        const { tripId } = req.params;

        if (!tripId) {
            return res.status(400).json({ error: "Trip ID is required." });
        }

        const { data: updatedTrip, error: updateError } = await supabase
            .from('trips')
            .update({ status: 'completed' })
            .eq('id', tripId)
            .select(`
                token_id,
                status,
                end_station_id,
                user_devices (token),
                stops!end_station_id (name)
            `)
            .single();

        if (updateError || !updatedTrip) {
            console.error("Supabase Error:", updateError);
            return res.status(404).json({ error: "Trip not found or could not be updated." });
        }
       
        const token = updatedTrip.user_devices?.token;
        const stationName = updatedTrip.stops?.name || "your destination";

        
        if (token) {
            const message = {
                notification: {
                    title: 'Arrived Safely!',
                    body: `You are approaching ${stationName} station. Please get ready to deboard. Have a great day with Sekka!`,
                },
                token: token,
            };

            admin.messaging().send(message)
                .then((response) => console.log('Successfully sent FCM message:', response))
                .catch((error) => console.error('Error sending FCM message:', error));
        }

       
        return res.status(200).json({
            message: "Trip marked as completed successfully.",
            tripId: tripId,
            status: "completed"
        });

    } catch (error) {
        console.error("Error in notifyArrival endpoint:", error.message);
        return res.status(500).json({
            error: "Internal Server Error",
            details: error.message
        });
    }
});

  
app.put("/trips/:tripId/cancel", async (req, res) => {
    try {
        const { tripId } = req.params;

        if (!tripId) {
            return res.status(400).json({ error: "Trip ID is required." });
        }

        
        const { data: updatedTrip, error: updateError } = await supabase
            .from('trips')
            .update({ status: 'cancelled' }) 
            .eq('id', tripId)
            .select(`
                token_id,
                end_station_id,
                user_devices (token),
                status,
                stops!end_station_id (name)
            `)
            .single();

        if (updateError || !updatedTrip) {
            console.error("Supabase Error:", updateError);
            return res.status(404).json({ error: "Trip not found or could not be cancelled." });
        }

        
        
        const fcmToken = updatedTrip.user_devices?.token;
        const stationName = updatedTrip.stops?.name || "your destination";

        
        
        if (fcmToken) {
            const message = {
                notification: {
                    title: 'Trip Cancelled ',
                    body: `Your trip tracking to ${stationName} station has been cancelled.`,
                },
                token: fcmToken,
            };

            admin.messaging().send(message)
                .then((response) => console.log('Successfully sent Cancel FCM:', response))
                .catch((error) => console.error('Error sending Cancel FCM:', error));
        }

        
        return res.status(200).json({
            message: "Trip tracking cancelled successfully.",
            tripId: tripId,
            status: "cancelled"
        });

    } catch (error) {
        console.error("Error in cancelTrip endpoint:", error.message);
        return res.status(500).json({
            error: "Internal Server Error",
            details: error.message
        });
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
