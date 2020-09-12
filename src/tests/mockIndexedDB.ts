const idbMocks = require('../../submodules/shelving-mock-indexeddb');

/**
 * Use in beforeEach to configure indexedDB fakes.
 */
export default function mockIndexedDB() {
    global.indexedDB = new idbMocks.IDBFactory();

    idbMocks.reset(); // Reset the fake indexedDB state
    global.IDBFactory = idbMocks.IDBFactory;
    global.IDBDatabase = idbMocks.IDBDatabase;
    global.IDBTransaction = idbMocks.IDBTransaction;
    global.IDBRequest = idbMocks.IDBRequest;
    global.IDBOpenDBRequest = idbMocks.IDBOpenDBRequest;
    global.IDBObjectStore = idbMocks.IDBObjectStore;
    global.IDBIndex = idbMocks.IDBIndex;
    global.IDBCursor = idbMocks.IDBCursor;
    global.IDBCursorWithValue = idbMocks.IDBCursorWithValue;
    global.IDBKeyRange = idbMocks.IDBKeyRange;
    global.IDBVersionChangeEvent = idbMocks.IDBVersionChangeEvent;
    global.DOMException = idbMocks.DOMException;
}
