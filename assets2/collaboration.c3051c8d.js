import { g as LexicalCollaborationContext_1, L as LexicalComposerContext_1, r as react, c as LexicalUtils_1, w as LexicalYjs_1, b as Lexical_1, e as reactDom, x as require$$7, y as setIfUndefined, z as create, A as fromBase64, C as onChange, D as varStorage, G as toBase64, H as offChange, I as createUint8ArrayFromArrayBuffer, J as writeVarUint, O as encodeStateVector, Q as writeVarUint8Array, R as encodeStateAsUpdate, S as readVarUint, U as readVarUint8Array, V as applyUpdate, W as readVarString, X as Observable, Y as floor, Z as getUnixTime, _ as equalityDeep, a0 as createEncoder, a1 as writeVarString, a2 as toUint8Array, a3 as createDecoder, a4 as map, a5 as length, a6 as min, a7 as pow, a8 as Doc } from "./main.29906b64.js";
var LexicalCollaborationPlugin_prod = {};
var f = LexicalCollaborationContext_1, g = LexicalComposerContext_1, k = react.exports, B = LexicalUtils_1, J = LexicalYjs_1, K = Lexical_1, L = reactDom.exports, M = require$$7;
function N(b, c, a, d, e, z, A, v, w, n, t) {
  let q = k.useRef(false), [x, r] = k.useState(d.get(c)), h = k.useMemo(() => J.createBinding(b, a, c, x, d, n), [b, a, c, d, x, n]), p = k.useCallback(() => {
    a.connect();
  }, [a]), y = k.useCallback(() => {
    try {
      a.disconnect();
    } catch (m) {
    }
  }, [a]);
  k.useEffect(() => {
    let { root: m } = h, { awareness: C } = a, D = ({ status: l }) => {
      b.dispatchCommand(J.CONNECTED_COMMAND, "connected" === l);
    }, E = (l) => {
      A && l && m.isEmpty() && 0 === m._xmlText._length && false === q.current && O(b, w);
      q.current = false;
    }, F = () => {
      J.syncCursorPositions(h, a);
    }, G = (l, u) => {
      u = u.origin;
      u !== h && J.syncYjsChangesToLexical(h, a, l, u instanceof M.UndoManager);
    };
    J.initLocalState(a, e, z, document.activeElement === b.getRootElement(), t || {});
    let H = (l) => {
      P(b, h);
      r(l);
      d.set(c, l);
      q.current = true;
    };
    a.on("reload", H);
    a.on("status", D);
    a.on("sync", E);
    C.on("update", F);
    m.getSharedType().observeDeep(G);
    let T = b.registerUpdateListener(({ prevEditorState: l, editorState: u, dirtyLeaves: Q, dirtyElements: R, normalizedNodes: S, tags: I }) => {
      false === I.has("skip-collab") && J.syncLexicalUpdateToYjs(h, a, l, u, R, Q, S, I);
    });
    p();
    return () => {
      false === q.current && y();
      a.off("sync", E);
      a.off("status", D);
      a.off("reload", H);
      C.off("update", F);
      m.getSharedType().unobserveDeep(G);
      d.delete(c);
      T();
    };
  }, [h, z, p, y, d, b, c, w, e, a, A, t]);
  let U = k.useMemo(() => L.createPortal(k.createElement("div", { ref: (m) => {
    h.cursorsContainer = m;
  } }), v && v.current || document.body), [h, v]);
  k.useEffect(
    () => b.registerCommand(J.TOGGLE_CONNECT_COMMAND, (m) => {
      void 0 !== p && void 0 !== y && (m ? (console.log("Collaboration connected!"), p()) : (console.log("Collaboration disconnected!"), y()));
      return true;
    }, K.COMMAND_PRIORITY_EDITOR),
    [p, y, b]
  );
  return [U, h];
}
function V(b, c, a, d, e) {
  k.useEffect(() => B.mergeRegister(b.registerCommand(K.FOCUS_COMMAND, () => {
    J.setLocalStateFocus(c, a, d, true, e || {});
    return false;
  }, K.COMMAND_PRIORITY_EDITOR), b.registerCommand(K.BLUR_COMMAND, () => {
    J.setLocalStateFocus(c, a, d, false, e || {});
    return false;
  }, K.COMMAND_PRIORITY_EDITOR)), [d, b, a, c, e]);
}
function W(b, c) {
  let a = k.useMemo(() => J.createUndoManager(c, c.root.getSharedType()), [c]);
  k.useEffect(() => B.mergeRegister(b.registerCommand(K.UNDO_COMMAND, () => {
    a.undo();
    return true;
  }, K.COMMAND_PRIORITY_EDITOR), b.registerCommand(K.REDO_COMMAND, () => {
    a.redo();
    return true;
  }, K.COMMAND_PRIORITY_EDITOR)));
  let d = k.useCallback(() => {
    a.clear();
  }, [a]);
  k.useEffect(() => {
    let e = () => {
      b.dispatchCommand(K.CAN_UNDO_COMMAND, 0 < a.undoStack.length);
      b.dispatchCommand(K.CAN_REDO_COMMAND, 0 < a.redoStack.length);
    };
    a.on(
      "stack-item-added",
      e
    );
    a.on("stack-item-popped", e);
    a.on("stack-cleared", e);
    return () => {
      a.off("stack-item-added", e);
      a.off("stack-item-popped", e);
      a.off("stack-cleared", e);
    };
  }, [b, a]);
  return d;
}
function O(b, c) {
  b.update(() => {
    var a = K.$getRoot();
    if (a.isEmpty())
      if (c)
        switch (typeof c) {
          case "string":
            var d = b.parseEditorState(c);
            b.setEditorState(d, { tag: "history-merge" });
            break;
          case "object":
            b.setEditorState(c, { tag: "history-merge" });
            break;
          case "function":
            b.update(() => {
              K.$getRoot().isEmpty() && c(b);
            }, { tag: "history-merge" });
        }
      else
        d = K.$createParagraphNode(), a.append(d), { activeElement: a } = document, (null !== K.$getSelection() || null !== a && a === b.getRootElement()) && d.select();
  }, { tag: "history-merge" });
}
function P(b, c) {
  b.update(() => {
    let d = K.$getRoot();
    d.clear();
    d.select();
  }, { tag: "skip-collab" });
  if (null != c.cursors && (b = c.cursors, null != b && (c = c.cursorsContainer, null != c))) {
    b = Array.from(b.values());
    for (let d = 0; d < b.length; d++) {
      var a = b[d].selection;
      if (a && null != a.selections) {
        a = a.selections;
        for (let e = 0; e < a.length; e++)
          c.removeChild(a[d]);
      }
    }
  }
}
LexicalCollaborationPlugin_prod.CollaborationPlugin = function({ id: b, providerFactory: c, shouldBootstrap: a, username: d, cursorColor: e, cursorsContainerRef: z, initialEditorState: A, excludedProperties: v, awarenessData: w }) {
  let n = f.useCollaborationContext(d, e), { yjsDocMap: t, name: q, color: x } = n, [r] = g.useLexicalComposerContext();
  k.useEffect(() => {
    n.isCollabActive = true;
    return () => {
      null == r._parentEditor && (n.isCollabActive = false);
    };
  }, [n, r]);
  d = k.useMemo(() => c(b, t), [b, c, t]);
  let [h, p] = N(r, b, d, t, q, x, a, z, A, v, w);
  n.clientID = p.clientID;
  W(r, p);
  V(r, d, q, x, w);
  return h;
};
const LexicalCollaborationPlugin = LexicalCollaborationPlugin_prod;
var LexicalCollaborationPlugin_1 = LexicalCollaborationPlugin;
const channels = /* @__PURE__ */ new Map();
class LocalStoragePolyfill {
  constructor(room) {
    this.room = room;
    this.onmessage = null;
    this._onChange = (e) => e.key === room && this.onmessage !== null && this.onmessage({ data: fromBase64(e.newValue || "") });
    onChange(this._onChange);
  }
  postMessage(buf) {
    varStorage.setItem(this.room, toBase64(createUint8ArrayFromArrayBuffer(buf)));
  }
  close() {
    offChange(this._onChange);
  }
}
const BC = typeof BroadcastChannel === "undefined" ? LocalStoragePolyfill : BroadcastChannel;
const getChannel = (room) => setIfUndefined(channels, room, () => {
  const subs = create();
  const bc = new BC(room);
  bc.onmessage = (e) => subs.forEach((sub) => sub(e.data, "broadcastchannel"));
  return {
    bc,
    subs
  };
});
const subscribe = (room, f2) => {
  getChannel(room).subs.add(f2);
  return f2;
};
const unsubscribe = (room, f2) => {
  const channel = getChannel(room);
  const unsubscribed = channel.subs.delete(f2);
  if (unsubscribed && channel.subs.size === 0) {
    channel.bc.close();
    channels.delete(room);
  }
  return unsubscribed;
};
const publish = (room, data, origin = null) => {
  const c = getChannel(room);
  c.bc.postMessage(data);
  c.subs.forEach((sub) => sub(data, origin));
};
const messageYjsSyncStep1 = 0;
const messageYjsSyncStep2 = 1;
const messageYjsUpdate = 2;
const writeSyncStep1 = (encoder, doc) => {
  writeVarUint(encoder, messageYjsSyncStep1);
  const sv = encodeStateVector(doc);
  writeVarUint8Array(encoder, sv);
};
const writeSyncStep2 = (encoder, doc, encodedStateVector) => {
  writeVarUint(encoder, messageYjsSyncStep2);
  writeVarUint8Array(encoder, encodeStateAsUpdate(doc, encodedStateVector));
};
const readSyncStep1 = (decoder, encoder, doc) => writeSyncStep2(encoder, doc, readVarUint8Array(decoder));
const readSyncStep2 = (decoder, doc, transactionOrigin) => {
  try {
    applyUpdate(doc, readVarUint8Array(decoder), transactionOrigin);
  } catch (error) {
    console.error("Caught error while handling a Yjs update", error);
  }
};
const writeUpdate = (encoder, update) => {
  writeVarUint(encoder, messageYjsUpdate);
  writeVarUint8Array(encoder, update);
};
const readUpdate = readSyncStep2;
const readSyncMessage = (decoder, encoder, doc, transactionOrigin) => {
  const messageType = readVarUint(decoder);
  switch (messageType) {
    case messageYjsSyncStep1:
      readSyncStep1(decoder, encoder, doc);
      break;
    case messageYjsSyncStep2:
      readSyncStep2(decoder, doc, transactionOrigin);
      break;
    case messageYjsUpdate:
      readUpdate(decoder, doc, transactionOrigin);
      break;
    default:
      throw new Error("Unknown message type");
  }
  return messageType;
};
const messagePermissionDenied = 0;
const readAuthMessage = (decoder, y, permissionDeniedHandler2) => {
  switch (readVarUint(decoder)) {
    case messagePermissionDenied:
      permissionDeniedHandler2(y, readVarString(decoder));
  }
};
const outdatedTimeout = 3e4;
class Awareness extends Observable {
  constructor(doc) {
    super();
    this.doc = doc;
    this.clientID = doc.clientID;
    this.states = /* @__PURE__ */ new Map();
    this.meta = /* @__PURE__ */ new Map();
    this._checkInterval = setInterval(() => {
      const now = getUnixTime();
      if (this.getLocalState() !== null && outdatedTimeout / 2 <= now - this.meta.get(this.clientID).lastUpdated) {
        this.setLocalState(this.getLocalState());
      }
      const remove = [];
      this.meta.forEach((meta, clientid) => {
        if (clientid !== this.clientID && outdatedTimeout <= now - meta.lastUpdated && this.states.has(clientid)) {
          remove.push(clientid);
        }
      });
      if (remove.length > 0) {
        removeAwarenessStates(this, remove, "timeout");
      }
    }, floor(outdatedTimeout / 10));
    doc.on("destroy", () => {
      this.destroy();
    });
    this.setLocalState({});
  }
  destroy() {
    this.emit("destroy", [this]);
    this.setLocalState(null);
    super.destroy();
    clearInterval(this._checkInterval);
  }
  getLocalState() {
    return this.states.get(this.clientID) || null;
  }
  setLocalState(state) {
    const clientID = this.clientID;
    const currLocalMeta = this.meta.get(clientID);
    const clock = currLocalMeta === void 0 ? 0 : currLocalMeta.clock + 1;
    const prevState = this.states.get(clientID);
    if (state === null) {
      this.states.delete(clientID);
    } else {
      this.states.set(clientID, state);
    }
    this.meta.set(clientID, {
      clock,
      lastUpdated: getUnixTime()
    });
    const added = [];
    const updated = [];
    const filteredUpdated = [];
    const removed = [];
    if (state === null) {
      removed.push(clientID);
    } else if (prevState == null) {
      if (state != null) {
        added.push(clientID);
      }
    } else {
      updated.push(clientID);
      if (!equalityDeep(prevState, state)) {
        filteredUpdated.push(clientID);
      }
    }
    if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
      this.emit("change", [{ added, updated: filteredUpdated, removed }, "local"]);
    }
    this.emit("update", [{ added, updated, removed }, "local"]);
  }
  setLocalStateField(field, value) {
    const state = this.getLocalState();
    if (state !== null) {
      this.setLocalState({
        ...state,
        [field]: value
      });
    }
  }
  getStates() {
    return this.states;
  }
}
const removeAwarenessStates = (awareness, clients, origin) => {
  const removed = [];
  for (let i = 0; i < clients.length; i++) {
    const clientID = clients[i];
    if (awareness.states.has(clientID)) {
      awareness.states.delete(clientID);
      if (clientID === awareness.clientID) {
        const curMeta = awareness.meta.get(clientID);
        awareness.meta.set(clientID, {
          clock: curMeta.clock + 1,
          lastUpdated: getUnixTime()
        });
      }
      removed.push(clientID);
    }
  }
  if (removed.length > 0) {
    awareness.emit("change", [{ added: [], updated: [], removed }, origin]);
    awareness.emit("update", [{ added: [], updated: [], removed }, origin]);
  }
};
const encodeAwarenessUpdate = (awareness, clients, states = awareness.states) => {
  const len = clients.length;
  const encoder = createEncoder();
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    const clientID = clients[i];
    const state = states.get(clientID) || null;
    const clock = awareness.meta.get(clientID).clock;
    writeVarUint(encoder, clientID);
    writeVarUint(encoder, clock);
    writeVarString(encoder, JSON.stringify(state));
  }
  return toUint8Array(encoder);
};
const applyAwarenessUpdate = (awareness, update, origin) => {
  const decoder = createDecoder(update);
  const timestamp = getUnixTime();
  const added = [];
  const updated = [];
  const filteredUpdated = [];
  const removed = [];
  const len = readVarUint(decoder);
  for (let i = 0; i < len; i++) {
    const clientID = readVarUint(decoder);
    let clock = readVarUint(decoder);
    const state = JSON.parse(readVarString(decoder));
    const clientMeta = awareness.meta.get(clientID);
    const prevState = awareness.states.get(clientID);
    const currClock = clientMeta === void 0 ? 0 : clientMeta.clock;
    if (currClock < clock || currClock === clock && state === null && awareness.states.has(clientID)) {
      if (state === null) {
        if (clientID === awareness.clientID && awareness.getLocalState() != null) {
          clock++;
        } else {
          awareness.states.delete(clientID);
        }
      } else {
        awareness.states.set(clientID, state);
      }
      awareness.meta.set(clientID, {
        clock,
        lastUpdated: timestamp
      });
      if (clientMeta === void 0 && state !== null) {
        added.push(clientID);
      } else if (clientMeta !== void 0 && state === null) {
        removed.push(clientID);
      } else if (state !== null) {
        if (!equalityDeep(state, prevState)) {
          filteredUpdated.push(clientID);
        }
        updated.push(clientID);
      }
    }
  }
  if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
    awareness.emit("change", [{
      added,
      updated: filteredUpdated,
      removed
    }, origin]);
  }
  if (added.length > 0 || updated.length > 0 || removed.length > 0) {
    awareness.emit("update", [{
      added,
      updated,
      removed
    }, origin]);
  }
};
const encodeQueryParams = (params2) => map(params2, (val, key) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`).join("&");
const messageSync = 0;
const messageQueryAwareness = 3;
const messageAwareness = 1;
const messageAuth = 2;
const messageHandlers = [];
messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced, _messageType) => {
  writeVarUint(encoder, messageSync);
  const syncMessageType = readSyncMessage(
    decoder,
    encoder,
    provider.doc,
    provider
  );
  if (emitSynced && syncMessageType === messageYjsSyncStep2 && !provider.synced) {
    provider.synced = true;
  }
};
messageHandlers[messageQueryAwareness] = (encoder, _decoder, provider, _emitSynced, _messageType) => {
  writeVarUint(encoder, messageAwareness);
  writeVarUint8Array(
    encoder,
    encodeAwarenessUpdate(
      provider.awareness,
      Array.from(provider.awareness.getStates().keys())
    )
  );
};
messageHandlers[messageAwareness] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
  applyAwarenessUpdate(
    provider.awareness,
    readVarUint8Array(decoder),
    provider
  );
};
messageHandlers[messageAuth] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
  readAuthMessage(
    decoder,
    provider.doc,
    (_ydoc, reason) => permissionDeniedHandler(provider, reason)
  );
};
const messageReconnectTimeout = 3e4;
const permissionDeniedHandler = (provider, reason) => console.warn(`Permission denied to access ${provider.url}.
${reason}`);
const readMessage = (provider, buf, emitSynced) => {
  const decoder = createDecoder(buf);
  const encoder = createEncoder();
  const messageType = readVarUint(decoder);
  const messageHandler = provider.messageHandlers[messageType];
  if (messageHandler) {
    messageHandler(encoder, decoder, provider, emitSynced, messageType);
  } else {
    console.error("Unable to compute message");
  }
  return encoder;
};
const setupWS = (provider) => {
  if (provider.shouldConnect && provider.ws === null) {
    const websocket = new provider._WS(provider.url);
    websocket.binaryType = "arraybuffer";
    provider.ws = websocket;
    provider.wsconnecting = true;
    provider.wsconnected = false;
    provider.synced = false;
    websocket.onmessage = (event) => {
      provider.wsLastMessageReceived = getUnixTime();
      const encoder = readMessage(provider, new Uint8Array(event.data), true);
      if (length(encoder) > 1) {
        websocket.send(toUint8Array(encoder));
      }
    };
    websocket.onerror = (event) => {
      provider.emit("connection-error", [event, provider]);
    };
    websocket.onclose = (event) => {
      provider.emit("connection-close", [event, provider]);
      provider.ws = null;
      provider.wsconnecting = false;
      if (provider.wsconnected) {
        provider.wsconnected = false;
        provider.synced = false;
        removeAwarenessStates(
          provider.awareness,
          Array.from(provider.awareness.getStates().keys()).filter(
            (client) => client !== provider.doc.clientID
          ),
          provider
        );
        provider.emit("status", [{
          status: "disconnected"
        }]);
      } else {
        provider.wsUnsuccessfulReconnects++;
      }
      setTimeout(
        setupWS,
        min(
          pow(2, provider.wsUnsuccessfulReconnects) * 100,
          provider.maxBackoffTime
        ),
        provider
      );
    };
    websocket.onopen = () => {
      provider.wsLastMessageReceived = getUnixTime();
      provider.wsconnecting = false;
      provider.wsconnected = true;
      provider.wsUnsuccessfulReconnects = 0;
      provider.emit("status", [{
        status: "connected"
      }]);
      const encoder = createEncoder();
      writeVarUint(encoder, messageSync);
      writeSyncStep1(encoder, provider.doc);
      websocket.send(toUint8Array(encoder));
      if (provider.awareness.getLocalState() !== null) {
        const encoderAwarenessState = createEncoder();
        writeVarUint(encoderAwarenessState, messageAwareness);
        writeVarUint8Array(
          encoderAwarenessState,
          encodeAwarenessUpdate(provider.awareness, [
            provider.doc.clientID
          ])
        );
        websocket.send(toUint8Array(encoderAwarenessState));
      }
    };
    provider.emit("status", [{
      status: "connecting"
    }]);
  }
};
const broadcastMessage = (provider, buf) => {
  const ws = provider.ws;
  if (provider.wsconnected && ws && ws.readyState === ws.OPEN) {
    ws.send(buf);
  }
  if (provider.bcconnected) {
    publish(provider.bcChannel, buf, provider);
  }
};
class WebsocketProvider extends Observable {
  constructor(serverUrl, roomname, doc, {
    connect = true,
    awareness = new Awareness(doc),
    params: params2 = {},
    WebSocketPolyfill = WebSocket,
    resyncInterval = -1,
    maxBackoffTime = 2500,
    disableBc = false
  } = {}) {
    super();
    while (serverUrl[serverUrl.length - 1] === "/") {
      serverUrl = serverUrl.slice(0, serverUrl.length - 1);
    }
    const encodedParams = encodeQueryParams(params2);
    this.maxBackoffTime = maxBackoffTime;
    this.bcChannel = serverUrl + "/" + roomname;
    this.url = serverUrl + "/" + roomname + (encodedParams.length === 0 ? "" : "?" + encodedParams);
    this.roomname = roomname;
    this.doc = doc;
    this._WS = WebSocketPolyfill;
    this.awareness = awareness;
    this.wsconnected = false;
    this.wsconnecting = false;
    this.bcconnected = false;
    this.disableBc = disableBc;
    this.wsUnsuccessfulReconnects = 0;
    this.messageHandlers = messageHandlers.slice();
    this._synced = false;
    this.ws = null;
    this.wsLastMessageReceived = 0;
    this.shouldConnect = connect;
    this._resyncInterval = 0;
    if (resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const encoder = createEncoder();
          writeVarUint(encoder, messageSync);
          writeSyncStep1(encoder, doc);
          this.ws.send(toUint8Array(encoder));
        }
      }, resyncInterval);
    }
    this._bcSubscriber = (data, origin) => {
      if (origin !== this) {
        const encoder = readMessage(this, new Uint8Array(data), false);
        if (length(encoder) > 1) {
          publish(this.bcChannel, toUint8Array(encoder), this);
        }
      }
    };
    this._updateHandler = (update, origin) => {
      if (origin !== this) {
        const encoder = createEncoder();
        writeVarUint(encoder, messageSync);
        writeUpdate(encoder, update);
        broadcastMessage(this, toUint8Array(encoder));
      }
    };
    this.doc.on("update", this._updateHandler);
    this._awarenessUpdateHandler = ({ added, updated, removed }, _origin) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = createEncoder();
      writeVarUint(encoder, messageAwareness);
      writeVarUint8Array(
        encoder,
        encodeAwarenessUpdate(awareness, changedClients)
      );
      broadcastMessage(this, toUint8Array(encoder));
    };
    this._unloadHandler = () => {
      removeAwarenessStates(
        this.awareness,
        [doc.clientID],
        "window unload"
      );
    };
    if (typeof window !== "undefined") {
      window.addEventListener("unload", this._unloadHandler);
    } else if (typeof process !== "undefined") {
      process.on("exit", this._unloadHandler);
    }
    awareness.on("update", this._awarenessUpdateHandler);
    this._checkInterval = setInterval(() => {
      if (this.wsconnected && messageReconnectTimeout < getUnixTime() - this.wsLastMessageReceived) {
        this.ws.close();
      }
    }, messageReconnectTimeout / 10);
    if (connect) {
      this.connect();
    }
  }
  get synced() {
    return this._synced;
  }
  set synced(state) {
    if (this._synced !== state) {
      this._synced = state;
      this.emit("synced", [state]);
      this.emit("sync", [state]);
    }
  }
  destroy() {
    if (this._resyncInterval !== 0) {
      clearInterval(this._resyncInterval);
    }
    clearInterval(this._checkInterval);
    this.disconnect();
    if (typeof window !== "undefined") {
      window.removeEventListener("unload", this._unloadHandler);
    } else if (typeof process !== "undefined") {
      process.off("exit", this._unloadHandler);
    }
    this.awareness.off("update", this._awarenessUpdateHandler);
    this.doc.off("update", this._updateHandler);
    super.destroy();
  }
  connectBc() {
    if (this.disableBc) {
      return;
    }
    if (!this.bcconnected) {
      subscribe(this.bcChannel, this._bcSubscriber);
      this.bcconnected = true;
    }
    const encoderSync = createEncoder();
    writeVarUint(encoderSync, messageSync);
    writeSyncStep1(encoderSync, this.doc);
    publish(this.bcChannel, toUint8Array(encoderSync), this);
    const encoderState = createEncoder();
    writeVarUint(encoderState, messageSync);
    writeSyncStep2(encoderState, this.doc);
    publish(this.bcChannel, toUint8Array(encoderState), this);
    const encoderAwarenessQuery = createEncoder();
    writeVarUint(encoderAwarenessQuery, messageQueryAwareness);
    publish(
      this.bcChannel,
      toUint8Array(encoderAwarenessQuery),
      this
    );
    const encoderAwarenessState = createEncoder();
    writeVarUint(encoderAwarenessState, messageAwareness);
    writeVarUint8Array(
      encoderAwarenessState,
      encodeAwarenessUpdate(this.awareness, [
        this.doc.clientID
      ])
    );
    publish(
      this.bcChannel,
      toUint8Array(encoderAwarenessState),
      this
    );
  }
  disconnectBc() {
    const encoder = createEncoder();
    writeVarUint(encoder, messageAwareness);
    writeVarUint8Array(
      encoder,
      encodeAwarenessUpdate(this.awareness, [
        this.doc.clientID
      ], /* @__PURE__ */ new Map())
    );
    broadcastMessage(this, toUint8Array(encoder));
    if (this.bcconnected) {
      unsubscribe(this.bcChannel, this._bcSubscriber);
      this.bcconnected = false;
    }
  }
  disconnect() {
    this.shouldConnect = false;
    this.disconnectBc();
    if (this.ws !== null) {
      this.ws.close();
    }
  }
  connect() {
    this.shouldConnect = true;
    if (!this.wsconnected && this.ws === null) {
      setupWS(this);
      this.connectBc();
    }
  }
}
const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);
const WEBSOCKET_ENDPOINT = params.get("collabEndpoint") || "ws://localhost:1234";
const WEBSOCKET_SLUG = "playground";
const WEBSOCKET_ID = params.get("collabId") || "0";
function createWebsocketProvider(id, yjsDocMap) {
  let doc = yjsDocMap.get(id);
  if (doc === void 0) {
    doc = new Doc();
    yjsDocMap.set(id, doc);
  } else {
    doc.load();
  }
  return new WebsocketProvider(WEBSOCKET_ENDPOINT, WEBSOCKET_SLUG + "/" + WEBSOCKET_ID + "/" + id, doc, {
    connect: false
  });
}
export { LexicalCollaborationPlugin_1 as L, createWebsocketProvider as c };
