import asyncio
import logging
import os
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.plugins import openai, silero

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Verify environment variables
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY]):
    logger.error("❌ Missing required environment variables!")
    logger.error("Required: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY")
    exit(1)

logger.info("✅ Environment variables verified")


async def entrypoint(ctx: JobContext):
    """Main entry point for the voice agent - called when a user joins a room"""
    
    logger.info(f"🚀 Agent joining room: {ctx.room.name}")
    
    # Define the system prompt for Alli
    initial_ctx = agents.llm.ChatContext().append(
        role="system",
        text=(
            "You are Alli, a friendly and supportive nutrition assistant. "
            "Your goal is to help people eat better and feel healthier. "
            "\n\n"
            "IMPORTANT: Keep your responses SHORT and CONVERSATIONAL since this is voice chat. "
            "Aim for 1-3 sentences per response unless the user specifically asks for detailed information. "
            "\n\n"
            "Guidelines:\n"
            "• Use simple, everyday language like talking to a friend\n"
            "• Be warm, kind, and encouraging - never judgmental\n"
            "• Focus on small, realistic tips people can actually do\n"
            "• Give practical advice for busy people\n"
            "• Don't diagnose medical conditions\n"
            "• Suggest seeing a doctor for serious health concerns"
        ),
    )

    # Connect to the room
    await ctx.connect()
    logger.info("✅ Connected to LiveKit room")

    # Create the voice assistant
    assistant = agents.VoiceAssistant(
        vad=silero.VAD.load(),  # Voice Activity Detection
        stt=openai.STT(model="whisper-1"),  # Speech-to-Text
        llm=openai.LLM(model="gpt-4o-mini"),  # Language Model
        tts=openai.TTS(voice="alloy"),  # Text-to-Speech
        chat_ctx=initial_ctx,
    )

    # Start the assistant
    assistant.start(ctx.room)
    logger.info("🎤 Voice assistant started and listening...")
    # @assistant.on_audio
# async def handle_audio(audio_chunk):
#     logger.info(f"📥 Received audio chunk: {len(audio_chunk)} samples")


    # Greet the user
    await assistant.say("Hi! I'm Alli, your nutrition assistant. How can I help you eat better today?")
    logger.info("👋 Greeted the user")


if __name__ == "__main__":
    logger.info("🎤 Starting Alli Voice Agent...")
    logger.info("📍 Agent will automatically join rooms when users connect")
    
    # Run the agent with the entrypoint function
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))