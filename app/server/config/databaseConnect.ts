import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return; // évite les connexions multiples

  const DATABASE_URL = process.env.DATABASE_URL as string;
  const DATABASE_NAME = process.env.DATABASE_NAME as string;

  try {
    await mongoose.connect(DATABASE_URL, { dbName: DATABASE_NAME });
    console.log("Connecté à la DB taskmanager");
  } catch (error) {
    console.log("Erreur de connexion", error);
    process.exit(1);
  }
};

export default connectDB;