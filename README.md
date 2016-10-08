# h-workspace

`h-workspace` is responsible for
  - managing workspaces
  - managing workspace permissions


# Notes on socket.io, wamp.ws, crossbar.io

There were many questions related to routing.
The initial design of the application consisted of thinking about a distributed routing system
with multiple routers.

We started with a 'pseudo-network' built without center routing.
Read the ideas behind TCP IP and UDP.
Read the WAMP.WS protocol description (not a RFC at this moment, just an internet draft, but with lots of interesting ideas) http://wamp-proto.org/

Crossbar.io was not used because it was implemented in python and might be hard to modify to be adequate to the requirements of our server.

Socket.io already has a routing model that supports rooms and namespaces.
This routing model does not attend all initial design ideas.

They are documented in _ideas directory

The ideas mainly consisted of subscribing to events of 'peers' that attended a given query.
Peers would have metadata that would be queryable.

And executing methods would also be possible through querying, so that rpc methods could be called on multiple host nodes.

We studied using engine.io as the transport instead of socket.io, but some factors changed our minds, they are, in order of relevance:

Socket.io protocol supports mixing binary and text contents, so that we may send structured messages over websocket and binary data along with it.
Socket.io has built-in support for adapters for horizontal scaling (such as socket.io-redis)
Socket.io supports Auto reconnect on the client
Socket.io has wide support over platforms

At start, we thought it would be possible to implement the dinamic-querying-based subscription system over socket.io and discard its namespace and room system, and implement it by ourselves, using socket.io only as the transport layer. But it turned out that horizontal scaling would be made very hard due to the fact that Redis does not support complex querying systems (originally we were using mongodb query language). Redis is only capable of hash storage, which perfectly fits socket.io rooms and namespaces (That indeed might be the real reason behind the routing system defined by socket.io).

As problems came to surface, the best decision is to modify our original system to adapt itself to the socket.io routing models, so that these lower level problems can take advantage of lots of peoples careful thinking.

In the future, whenever we have some sparing resources, the server side architecture might be fully reimplemented using this dynamic routing system, but for the time being we shall adapt ourselves to what is already rock-solid.
