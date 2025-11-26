// Message.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Message } from '@modules/message.js';

// Define a fixed mock time for predictable timestamps
const MOCK_DATE = 1678886400000; // Represents: Mar 15 2023 09:00:00 GMT

describe('Message Class', () => {
    // Use fake timers to control Date.now() for predictable timestamps
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(MOCK_DATE);
    });

    afterEach(() => {
        // Restore the real timers after each test
        vi.useRealTimers();
    });

    // --- Constructor Tests ---

    it('should create a Message instance with correct properties', () => {
        const content = 'Hello Vitest!';
        const sender = 'user'; // Using 'user' as the role

        // FIX: Pass an object, not individual arguments
        const message = new Message({ content: content, role: sender });

        expect(message).toBeInstanceOf(Message);
        expect(message.content).toBe(content);

        // FIX: The class uses 'role', not 'sender'
        expect(message.role).toBe(sender);

        // FIX: The class converts timestamp to ISO String.
        // We check if the timestamp string matches the ISO version of our Mock Date
        expect(message.timestamp).toBe(new Date(MOCK_DATE).toISOString());
    });

    it('should throw an error if content is empty', () => {
        // FIX: Pass object structure
        expect(() => new Message({ content: '', role: 'user' })).toThrow('Message content cannot be empty.');
    });

    it('should throw an error if role (sender) is empty', () => {
        // FIX: Pass object structure with missing role
        expect(() => new Message({ content: 'Content', role: '' })).toThrow('Message sender cannot be empty.');
    });

    it('should throw an error if content is not a string', () => {
        // @ts-ignore testing invalid input
        // FIX: Pass object structure
        expect(() => new Message({ content: 123, role: 'user' })).toThrow('Message content cannot be empty.');
    });

    // --- Method Tests ---

    it('getFormattedMessage should return a correctly formatted string', () => {
        const content = 'Meeting at 10 AM.';
        const sender = 'user';

        // FIX: Pass object structure
        const message = new Message({ content: content, role: sender });

        // Assuming the class uses getFormattedTime() internally which uses toLocaleTimeString
        const expectedTime = new Date(MOCK_DATE).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expectedFormat = `[${expectedTime}] ${sender}: ${content}`;

        expect(message.getFormattedMessage()).toBe(expectedFormat);

        expect(message.getFormattedMessage()).toContain(content);
        expect(message.getFormattedMessage()).toContain(sender);
        expect(message.getFormattedMessage()).toMatch(/\[.*\]/);
    });
});
