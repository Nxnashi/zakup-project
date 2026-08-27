from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import catalog, orders, purchasing
from . import seed as seed_module

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Закуп-бот API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router, tags=["catalog"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(purchasing.router, prefix="/purchasing", tags=["purchasing"])


@app.on_event("startup")
def on_startup():
    seed_module.seed()


@app.get("/health")
def health():
    return {"status": "ok"}
