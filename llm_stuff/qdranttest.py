from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from sentence_transformers import SentenceTransformer
import os


client = QdrantClient(
    host="localhost",
    port=6333,
)

client.create_collection(
    collection_name="test_collection",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
)

model = SentenceTransformer('all-MiniLM-L6-v2')

documents = []

encoded_stuff = model.encode(documents)
points = [PointStruct(id=i, vector=encoded_stuff.tolist()[i], payload={"text": doc}) for i, (doc, embedding) in 
          enumerate(zip(documents, encoded_stuff))]

client.upsert(
    collection_name="test_collection",
    points=points
)









from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from sentence_transformers import SentenceTransformer

client = QdrantClient(
    host="localhost",
    port=6333,
)

client.create_collection(
    collection_name="test_collection",
    vectors.config=VectorParams(size=384, distance = Distance.COSINE)

)

model = SentenceTransformer('all-MiniLM-L6-v2')

documents=[]

encoded_stuff = model.encode(documents)

points=[PointStruct(id=i, vector=encoded_stuff.tolist()[i], payload={"text": doc}) for i, (doc, embedding) in enumerate(zip(documents, encoded_stuff))]

client.upsert(
    collection_name="test_collection",
    points=points
)