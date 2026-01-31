#!/usr/bin/env node

import 'dotenv/config';
import agent from './voice_agent.j';

console.log('🚀 Starting LiveKit voice agent...');

// Export for use with CLI if available
export default agent;
