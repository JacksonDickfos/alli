#!/usr/bin/env python3
"""
Alli Python Voice Agent - Flask server for voice response processing
"""

import os
import sys
import logging
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Verify environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

if not OPENAI_API_KEY:
    logger.error('❌ Missing OPENAI_API_KEY')
    sys.exit(1)

logger.info('✅ Environment variables verified')

# Initialize Flask and OpenAI
app = Flask(__name__)
client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """You are Alli, a friendly nutrition and health assistant.
Your goal is to help people eat better and feel healthier in a simple, encouraging way.
Always respond conversationally and helpfully.

Guidelines:
• Use simple, everyday language like talking to a friend
• Avoid medical or scientific terms when possible
• If a technical word is needed, explain it simply
• Be warm, kind, and supportive
• Focus on small, realistic tips that are easy to try
• Keep advice practical for busy people
• Do not diagnose medical conditions
• Do not promise specific health results
• For serious health concerns, encourage seeing a doctor"""

@app.route('/process-voice', methods=['POST'])
def process_voice():
    """Process voice message and return AI response."""
    try:
        data = request.get_json()
        message = data.get('message')

        if not message:
            return jsonify({'error': 'message is required'}), 400

        logger.info(f'📝 Processing message: {message}')

        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=150,
        )

        agent_response = response.choices[0].message.content
        logger.info(f'🤖 Agent response: {agent_response}')

        return jsonify({'response': agent_response}), 200

    except Exception as e:
        logger.error(f'❌ Error: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    logger.info('🚀 Starting Alli Python Voice Agent Server...')
    logger.info('📍 Listening on http://localhost:3002')
    app.run(host='localhost', port=3002, debug=False)
