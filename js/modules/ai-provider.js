/**
 * ============================================
 * AI PROVIDER CLASS
 * ============================================
 * Handles direct communication with LLM APIs
 */

export class AIProvider {
    constructor(config) {
        this.id = config.id || `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.name = config.name;
        this.type = config.type || 'custom';
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey || '';
        this.defaultModel = config.defaultModel || '';
        this.models = config.models || [];
        this.enabled = config.enabled !== false;
    }

    /**
     * Prepare headers for the request
     */
    _getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiKey) {
            if (this.type === 'anthropic') {
                headers['x-api-key'] = this.apiKey;
                headers['anthropic-version'] = '2023-06-01';
            } else {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
        }
        return headers;
    }

    /**
     * Test the connection to the API
     */
    async testConnection() {
        try {
            const headers = this._getHeaders();
            
            let url = this.apiUrl;
            const isChatEndpoint = url.endsWith('/chat/completions');
            
            let body = null;
            let method = 'GET';

            if (isChatEndpoint) {
                method = 'POST';
                body = JSON.stringify({
                    model: this.defaultModel || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 1
                });
            } else {
                url = url.endsWith('/') ? `${url}models` : `${url}/models`;
            }

            const response = await fetch(url, {
                method: method,
                headers: headers,
                body: body
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            return { success: true, message: 'Connection successful', data };

        } catch (error) {
            console.error('Provider Test Error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Send a chat request
     */
    async sendRequest(messages, modelId) {
        const headers = this._getHeaders();
        
        let url = this.apiUrl;
        if (!url.endsWith('/chat/completions') && !url.includes('/messages')) {
             url = url.replace(/\/$/, '') + '/chat/completions';
        }

        const payload = {
            model: modelId || this.defaultModel,
            messages: messages,
            temperature: 0.7,
            stream: false 
        };

        if (this.type === 'anthropic') {
            payload.max_tokens = 4096;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (this.type === 'anthropic') {
            return data.content[0].text;
        } else {
            return data.choices[0].message.content;
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            apiUrl: this.apiUrl,
            apiKey: this.apiKey,
            defaultModel: this.defaultModel,
            models: this.models,
            enabled: this.enabled
        };
    }
}
