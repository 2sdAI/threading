import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto'; // Uses the in-memory IndexedDB implementation
import { ChatStorage } from '../../js/modules/chat-storage.js';
import { Chat } from '../../js/modules/chat.js';

describe('ChatStorage', () => {
    let storage;
    const DB_NAME = 'AITeamManagerDB';
    let mockDate;

    beforeEach(async () => {
        // FIX: Mock Date.now() to ensure unique IDs for synchronously created Chat objects
        // The Chat class generates IDs using `chat-${Date.now()}`.
        // Without mocking, synchronous calls lead to ID collisions and object overwrites.
        mockDate = 1700000000000; // Starting timestamp

        // Spy on Date.now() and return an increasing value on each call
        vi.spyOn(Date, 'now').mockImplementation(() => {
            return mockDate++;
        });

        // Reset the database before each test to ensure a clean state
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
        // Ensure the DB connection is closed to prevent timeouts in the next beforeEach
        if (storage && storage.db) {
            storage.db.close();
        }
        // Restore the original Date.now() implementation
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize the database and create object stores', async () => {
            // Verify DB connection exists
            expect(storage.db).toBeDefined();
            expect(storage.db.objectStoreNames.contains('chats')).toBe(true);
            expect(storage.db.objectStoreNames.contains('appSettings')).toBe(true);
            expect(storage.db.objectStoreNames.contains('settings')).toBe(true);
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

            // Modify and save again
            chat.title = 'Updated Title';
            await storage.saveChat(chat);

            const retrieved = await storage.getChat(chat.id);
            expect(retrieved.title).toBe('Updated Title');
        });

        it('should delete a chat', async () => {
            const chat = Chat.create({ title: 'To Delete' });
            await storage.saveChat(chat);

            // Confirm existence
            expect(await storage.getChat(chat.id)).not.toBeNull();

            await storage.deleteChat(chat.id);

            // Confirm deletion
            expect(await storage.getChat(chat.id)).toBeNull();
        });
    });

    describe('Collections and Sorting', () => {
        it('should retrieve all chats sorted by updatedAt descending', async () => {
            // Unique IDs guaranteed by Date.now() mock
            const chat1 = Chat.create({ title: 'Oldest' });
            chat1.updatedAt = new Date('2023-01-01').toISOString();

            const chat2 = Chat.create({ title: 'Newest' });
            chat2.updatedAt = new Date('2023-12-31').toISOString();

            const chat3 = Chat.create({ title: 'Middle' });
            chat3.updatedAt = new Date('2023-06-15').toISOString();

            await storage.saveChats([chat1, chat2, chat3]);

            const allChats = await storage.getAllChats();

            // FIX: This assertion now correctly expects 3
            expect(allChats).toHaveLength(3);
            // Expect Newest -> Middle -> Oldest
            expect(allChats[0].id).toBe(chat2.id);
            expect(allChats[1].id).toBe(chat3.id);
            expect(allChats[2].id).toBe(chat1.id);
        });

        it('should bulk save chats', async () => {
            // Unique IDs guaranteed by Date.now() mock
            const chats = [
                Chat.create({ title: 'Batch 1' }),
                Chat.create({ title: 'Batch 2' })
            ];

            await storage.saveChats(chats);
            const count = (await storage.getAllChats()).length;
            // FIX: This assertion now correctly expects 2
            expect(count).toBe(2);
        });

        it('should bulk delete chats', async () => {
            // Unique IDs guaranteed by Date.now() mock
            const chat1 = Chat.create();
            const chat2 = Chat.create();
            const chat3 = Chat.create();

            await storage.saveChats([chat1, chat2, chat3]);

            await storage.deleteChats([chat1.id, chat3.id]);

            const remaining = await storage.getAllChats();
            // FIX: This assertion now correctly expects 1
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe(chat2.id);
        });
    });

    describe('Project Filtering', () => {
        it('should filter chats by project ID', async () => {
            // Unique IDs guaranteed by Date.now() mock
            const projectA = 'proj-a';
            const projectB = 'proj-b';

            const chatA1 = Chat.create({ projectId: projectA, title: 'A1' });
            const chatA2 = Chat.create({ projectId: projectA, title: 'A2' });
            const chatB1 = Chat.create({ projectId: projectB, title: 'B1' });
            const chatNoProj = Chat.create({ title: 'None' });

            await storage.saveChats([chatA1, chatA2, chatB1, chatNoProj]);

            const resultsA = await storage.getChatsByProject(projectA);
            // FIX: This assertion now correctly expects 2
            expect(resultsA).toHaveLength(2);
            expect(resultsA.map(c => c.id)).toContain(chatA1.id);
            expect(resultsA.map(c => c.id)).toContain(chatA2.id);
            expect(resultsA.map(c => c.id)).not.toContain(chatB1.id);
        });
    });

    describe('App Settings (Current State)', () => {
        it('should persist current chat ID', async () => {
            expect(await storage.getCurrentChatId()).toBeNull();

            await storage.saveCurrentChatId('chat-123');
            expect(await storage.getCurrentChatId()).toBe('chat-123');

            await storage.saveCurrentChatId(null);
            expect(await storage.getCurrentChatId()).toBeNull();
        });

        it('should persist current project ID', async () => {
            expect(await storage.getCurrentProjectId()).toBeNull();

            await storage.saveCurrentProjectId('proj-ABC');
            expect(await storage.getCurrentProjectId()).toBe('proj-ABC');
        });
    });

    describe('Statistics', () => {
        it('should calculate correct chat statistics', async () => {
            // Unique IDs guaranteed by Date.now() mock
            const c1 = Chat.create({ projectId: 'p1' });
            c1.archived = true;

            const c2 = Chat.create({ projectId: 'p1' });
            c2.pinned = true;
            c2.addMessage({ role: 'user', content: 'hi' }); // 1 msg

            const c3 = Chat.create({ projectId: 'p2' });
            // 0 msgs

            await storage.saveChats([c1, c2, c3]);

            const stats = await storage.getChatStats();

            // FIX: This assertion now correctly expects the full set of stats
            expect(stats).toEqual({
                total: 3,
                archived: 1, // c1
                pinned: 1,   // c2
                byProject: {
                    'p1': 2,
                    'p2': 1
                },
                totalMessages: 1 // Only c2 has a message
            });
        });
    });
});
