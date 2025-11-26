import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ChatStorage } from '@/modules/chat-storage.js';
import { Chat } from '@/modules/chat.js';

describe('ChatStorage', () => {
    let storage;
    const DB_NAME = 'AITeamManagerDB';
    let mockDate;

    beforeEach(async () => {
        mockDate = 1700000000000;
        vi.spyOn(Date, 'now').mockImplementation(() => {
            return mockDate++;
        });

        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        await new Promise((resolve, reject) => {
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
            deleteRequest.onblocked = () => {
                console.warn('Delete database blocked by open connection');
                resolve();
            };
        });

        storage = new ChatStorage();
        await storage.init();
    });

    afterEach(() => {
        if (storage && storage.db) {
            storage.db.close();
        }
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize the database and create object stores', async () => {
            expect(storage.db).toBeDefined();
            expect(storage.db.objectStoreNames.contains('chats')).toBe(true);
            expect(storage.db.objectStoreNames.contains('appSettings')).toBe(true);
            expect(storage.db.objectStoreNames.contains('settings')).toBe(true);
        });

        it('should have correct database version', () => {
            expect(storage.db.version).toBe(2);
        });

        it('should have correct database name', () => {
            expect(storage.dbName).toBe('AITeamManagerDB');
        });

        it('should set db.onerror handler during init', async () => {
            // The db.onerror is set in onsuccess handler
            expect(storage.db.onerror).toBeDefined();
        });
    });

    describe('ensureDB', () => {
        it('should return existing db if already initialized', async () => {
            const db = await storage.ensureDB();
            expect(db).toBe(storage.db);
        });

        it('should initialize db if not already initialized', async () => {
            // Close and clear existing db
            storage.db.close();
            storage.db = null;

            const db = await storage.ensureDB();
            expect(db).toBeDefined();
            expect(storage.db).toBe(db);
        });
    });

    describe('CRUD Operations', () => {
        it('should save and retrieve a chat', async () => {
            const chat = Chat.create({ title: 'Test Chat' });
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);

            expect(retrieved).toBeInstanceOf(Chat);
            expect(retrieved.id).toBe(chat.id);
            expect(retrieved.title).toBe('Test Chat');
        });

        it('should return null for non-existent chat', async () => {
            const result = await storage.getChat('non-existent-id');
            expect(result).toBeNull();
        });

        it('should update an existing chat', async () => {
            const chat = Chat.create({ title: 'Original Title' });
            await storage.saveChat(chat);

            chat.title = 'Updated Title';
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);
            expect(retrieved.title).toBe('Updated Title');
        });

        it('should delete a chat', async () => {
            const chat = Chat.create({ title: 'To Delete' });
            await storage.saveChat(chat);

            expect(await storage.getChat(chat.id)).not.toBeNull();

            await storage.deleteChat(chat.id);

            expect(await storage.getChat(chat.id)).toBeNull();
        });

        it('should handle saving chat with messages', async () => {
            const chat = Chat.create({ title: 'Chat with Messages' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chat.addMessage({ role: 'assistant', content: 'Hi there!' });
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);
            expect(retrieved.messages).toHaveLength(2);
            expect(retrieved.messages[0].content).toBe('Hello');
        });

        it('should preserve chat metadata', async () => {
            const chat = Chat.create({ title: 'Metadata Test' });
            chat.archived = true;
            chat.pinned = true;
            chat.metadata = { custom: 'value' };
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);
            expect(retrieved.archived).toBe(true);
            expect(retrieved.pinned).toBe(true);
            expect(retrieved.metadata).toEqual({ custom: 'value' });
        });
    });

    describe('Collections and Sorting', () => {
        it('should retrieve all chats sorted by updatedAt descending', async () => {
            const chat1 = Chat.create({ title: 'Oldest' });
            chat1.updatedAt = new Date('2023-01-01').toISOString();

            const chat2 = Chat.create({ title: 'Newest' });
            chat2.updatedAt = new Date('2023-12-31').toISOString();

            const chat3 = Chat.create({ title: 'Middle' });
            chat3.updatedAt = new Date('2023-06-15').toISOString();

            await storage.saveChats([chat1, chat2, chat3]);

            const allChats = await storage.getAllChats();

            expect(allChats).toHaveLength(3);
            expect(allChats[0].id).toBe(chat2.id);
            expect(allChats[1].id).toBe(chat3.id);
            expect(allChats[2].id).toBe(chat1.id);
        });

        it('should bulk save chats', async () => {
            const chats = [
                Chat.create({ title: 'Chat 1' }),
                Chat.create({ title: 'Chat 2' }),
                Chat.create({ title: 'Chat 3' })
            ];

            await storage.saveChats(chats);

            const allChats = await storage.getAllChats();
            expect(allChats).toHaveLength(3);
        });

        it('should bulk delete chats', async () => {
            const chats = [
                Chat.create({ title: 'Chat 1' }),
                Chat.create({ title: 'Chat 2' }),
                Chat.create({ title: 'Chat 3' })
            ];
            await storage.saveChats(chats);

            await storage.deleteChats([chats[0].id, chats[1].id]);

            const allChats = await storage.getAllChats();
            expect(allChats).toHaveLength(1);
            expect(allChats[0].id).toBe(chats[2].id);
        });

        it('should handle empty bulk operations', async () => {
            await storage.saveChats([]);
            await storage.deleteChats([]);

            const allChats = await storage.getAllChats();
            expect(allChats).toHaveLength(0);
        });
    });

    describe('Project Filtering', () => {
        it('should filter chats by project ID', async () => {
            const projectChats = [
                Chat.create({ title: 'Project Chat 1', projectId: 'project-1' }),
                Chat.create({ title: 'Project Chat 2', projectId: 'project-1' })
            ];
            const otherChat = Chat.create({ title: 'Other Chat', projectId: 'project-2' });

            await storage.saveChats([...projectChats, otherChat]);

            const filtered = await storage.getChatsByProject('project-1');

            expect(filtered).toHaveLength(2);
            expect(filtered.every(c => c.projectId === 'project-1')).toBe(true);
        });

        it('should return chats sorted by updatedAt when filtering by project', async () => {
            const chat1 = Chat.create({ title: 'Old', projectId: 'project-1' });
            chat1.updatedAt = new Date('2023-01-01').toISOString();

            const chat2 = Chat.create({ title: 'New', projectId: 'project-1' });
            chat2.updatedAt = new Date('2023-12-31').toISOString();

            await storage.saveChats([chat1, chat2]);

            const filtered = await storage.getChatsByProject('project-1');

            expect(filtered[0].title).toBe('New');
            expect(filtered[1].title).toBe('Old');
        });

        it('should return empty array for non-existent project', async () => {
            const chat = Chat.create({ title: 'Test', projectId: 'existing-project' });
            await storage.saveChat(chat);

            const filtered = await storage.getChatsByProject('non-existent-project');
            expect(filtered).toHaveLength(0);
        });
    });

    describe('App Settings (Current State)', () => {
        it('should persist current chat ID', async () => {
            await storage.saveCurrentChatId('chat-123');
            const retrieved = await storage.getCurrentChatId();
            expect(retrieved).toBe('chat-123');
        });

        it('should return null for unset current chat ID', async () => {
            const retrieved = await storage.getCurrentChatId();
            expect(retrieved).toBeNull();
        });

        it('should persist current project ID', async () => {
            await storage.saveCurrentProjectId('project-456');
            const retrieved = await storage.getCurrentProjectId();
            expect(retrieved).toBe('project-456');
        });

        it('should return null for unset current project ID', async () => {
            const retrieved = await storage.getCurrentProjectId();
            expect(retrieved).toBeNull();
        });

        it('should update current chat ID', async () => {
            await storage.saveCurrentChatId('chat-1');
            await storage.saveCurrentChatId('chat-2');

            const retrieved = await storage.getCurrentChatId();
            expect(retrieved).toBe('chat-2');
        });

        it('should update current project ID', async () => {
            await storage.saveCurrentProjectId('project-1');
            await storage.saveCurrentProjectId('project-2');

            const retrieved = await storage.getCurrentProjectId();
            expect(retrieved).toBe('project-2');
        });

        it('should allow setting null values', async () => {
            await storage.saveCurrentChatId('chat-123');
            await storage.saveCurrentChatId(null);

            const retrieved = await storage.getCurrentChatId();
            expect(retrieved).toBeNull();
        });
    });

    describe('Clear All Chats', () => {
        it('should clear all chats from storage', async () => {
            const chats = [
                Chat.create({ title: 'Chat 1' }),
                Chat.create({ title: 'Chat 2' }),
                Chat.create({ title: 'Chat 3' })
            ];
            await storage.saveChats(chats);

            expect((await storage.getAllChats())).toHaveLength(3);

            await storage.clearAllChats();

            expect((await storage.getAllChats())).toHaveLength(0);
        });

        it('should handle clearing empty storage', async () => {
            await storage.clearAllChats();
            const allChats = await storage.getAllChats();
            expect(allChats).toHaveLength(0);
        });

        it('should not affect app settings when clearing chats', async () => {
            await storage.saveCurrentChatId('chat-123');
            await storage.saveCurrentProjectId('project-456');

            const chat = Chat.create({ title: 'Test' });
            await storage.saveChat(chat);

            await storage.clearAllChats();

            // App settings should remain
            expect(await storage.getCurrentChatId()).toBe('chat-123');
            expect(await storage.getCurrentProjectId()).toBe('project-456');
        });
    });

    describe('Export and Import', () => {
        it('should export all chats', async () => {
            const chat1 = Chat.create({ title: 'Export Chat 1' });
            chat1.addMessage({ role: 'user', content: 'Hello' });

            const chat2 = Chat.create({ title: 'Export Chat 2' });

            await storage.saveChats([chat1, chat2]);

            const exported = await storage.exportChats();

            expect(exported).toHaveLength(2);
            expect(exported[0]).toHaveProperty('id');
            expect(exported[0]).toHaveProperty('title');
            expect(exported[0]).toHaveProperty('messages');
            // Exported data should be plain objects, not Chat instances
            expect(exported[0]).not.toBeInstanceOf(Chat);
        });

        it('should export empty array when no chats exist', async () => {
            const exported = await storage.exportChats();
            expect(exported).toEqual([]);
        });

        it('should import chats from data', async () => {
            const chatsData = [
                {
                    id: 'import-1',
                    title: 'Imported Chat 1',
                    messages: [{ role: 'user', content: 'Test' }],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'import-2',
                    title: 'Imported Chat 2',
                    messages: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];

            const imported = await storage.importChats(chatsData);

            expect(imported).toHaveLength(2);
            expect(imported[0]).toBeInstanceOf(Chat);
            expect(imported[0].title).toBe('Imported Chat 1');

            // Verify they're actually in storage
            const allChats = await storage.getAllChats();
            expect(allChats).toHaveLength(2);
        });

        it('should import empty array', async () => {
            const imported = await storage.importChats([]);
            expect(imported).toEqual([]);
        });

        it('should roundtrip export and import', async () => {
            const originalChat = Chat.create({ title: 'Roundtrip Test' });
            originalChat.addMessage({ role: 'user', content: 'Hello' });
            originalChat.addMessage({ role: 'assistant', content: 'Hi!' });
            originalChat.archived = true;
            originalChat.pinned = true;
            originalChat.projectId = 'project-123';
            await storage.saveChat(originalChat);

            const exported = await storage.exportChats();

            // Clear and reimport
            await storage.clearAllChats();
            const imported = await storage.importChats(exported);

            expect(imported).toHaveLength(1);
            expect(imported[0].id).toBe(originalChat.id);
            expect(imported[0].title).toBe('Roundtrip Test');
            expect(imported[0].messages).toHaveLength(2);
            expect(imported[0].archived).toBe(true);
            expect(imported[0].pinned).toBe(true);
            expect(imported[0].projectId).toBe('project-123');
        });
    });

    describe('Statistics', () => {
        it('should calculate correct chat statistics', async () => {
            const chat1 = Chat.create({ title: 'Chat 1', projectId: 'project-a' });
            chat1.addMessage({ role: 'user', content: 'Hello' });
            chat1.addMessage({ role: 'assistant', content: 'Hi' });

            const chat2 = Chat.create({ title: 'Chat 2', projectId: 'project-a' });
            chat2.archived = true;
            chat2.addMessage({ role: 'user', content: 'Test' });

            const chat3 = Chat.create({ title: 'Chat 3', projectId: 'project-b' });
            chat3.pinned = true;

            const chat4 = Chat.create({ title: 'Chat 4' }); // No project

            await storage.saveChats([chat1, chat2, chat3, chat4]);

            const stats = await storage.getChatStats();

            expect(stats.total).toBe(4);
            expect(stats.archived).toBe(1);
            expect(stats.pinned).toBe(1);
            expect(stats.byProject['project-a']).toBe(2);
            expect(stats.byProject['project-b']).toBe(1);
            expect(stats.byProject['no-project']).toBe(1);
            expect(stats.totalMessages).toBe(3);
        });

        it('should return zero stats for empty storage', async () => {
            const stats = await storage.getChatStats();

            expect(stats.total).toBe(0);
            expect(stats.archived).toBe(0);
            expect(stats.pinned).toBe(0);
            expect(stats.byProject).toEqual({});
            expect(stats.totalMessages).toBe(0);
        });

        it('should count all message types in totalMessages', async () => {
            const chat = Chat.create({ title: 'Message Count Test' });
            chat.addMessage({ role: 'user', content: '1' });
            chat.addMessage({ role: 'assistant', content: '2' });
            chat.addMessage({ role: 'user', content: '3' });
            chat.addMessage({ role: 'assistant', content: '4' });
            chat.addMessage({ role: 'user', content: '5' });
            await storage.saveChat(chat);

            const stats = await storage.getChatStats();
            expect(stats.totalMessages).toBe(5);
        });
    });

    describe('Error Handling', () => {
        it('should handle database initialization when db is null in ensureDB', async () => {
            const newStorage = new ChatStorage();
            // Don't call init(), let ensureDB handle it

            const db = await newStorage.ensureDB();
            expect(db).toBeDefined();

            // Cleanup
            db.close();
        });

        it('should be able to save chat after ensureDB auto-initializes', async () => {
            const newStorage = new ChatStorage();
            // Don't call init()

            const chat = Chat.create({ title: 'Auto Init Test' });
            await newStorage.saveChat(chat);

            const retrieved = await newStorage.getChat(chat.id);
            expect(retrieved.title).toBe('Auto Init Test');

            // Cleanup
            newStorage.db.close();
        });
    });

    describe('Edge Cases', () => {
        it('should handle chat with empty title defaulting to New Chat', async () => {
            // Note: Chat.create uses `config.title || 'New Chat'` so empty string defaults
            const chat = Chat.create({ title: '' });
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);
            expect(retrieved.title).toBe('New Chat');
        });

        it('should handle chat with very long title', async () => {
            const longTitle = 'A'.repeat(1000);
            const chat = Chat.create({ title: longTitle });
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);
            expect(retrieved.title).toBe(longTitle);
        });

        it('should handle special characters in chat data', async () => {
            const chat = Chat.create({ title: '特殊字符 🎉 <script>alert("xss")</script>' });
            chat.addMessage({ role: 'user', content: 'Emoji: 🚀💻🎮' });
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);
            expect(retrieved.title).toBe('特殊字符 🎉 <script>alert("xss")</script>');
            expect(retrieved.messages[0].content).toBe('Emoji: 🚀💻🎮');
        });

        it('should handle rapid successive saves', async () => {
            const chat = Chat.create({ title: 'Rapid Save Test' });

            // Perform many saves rapidly
            const savePromises = [];
            for (let i = 0; i < 10; i++) {
                chat.title = `Title ${i}`;
                savePromises.push(storage.saveChat(chat));
            }

            await Promise.all(savePromises);

            const retrieved = await storage.getChat(chat.id);
            // Should have one of the titles (last one likely)
            expect(retrieved.title).toMatch(/^Title \d$/);
        });

        it('should handle concurrent reads and writes', async () => {
            const chat = Chat.create({ title: 'Concurrent Test' });
            await storage.saveChat(chat);

            const operations = [
                storage.getChat(chat.id),
                storage.getAllChats(),
                storage.saveChat(chat),
                storage.getChat(chat.id)
            ];

            const results = await Promise.all(operations);

            expect(results[0]).toBeInstanceOf(Chat);
            expect(Array.isArray(results[1])).toBe(true);
            expect(results[3]).toBeInstanceOf(Chat);
        });
    });
});
