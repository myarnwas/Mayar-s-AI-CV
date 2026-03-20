import os
import uvicorn
from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ask_service import answer_question
from load_data import load_data

_load_env = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_load_env)
load_dotenv()

app = FastAPI()

_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if os.getenv("CORS_ORIGINS"):
    _cors_origins.extend(o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip())
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}


def _cv_data():
    return load_data()


@app.get("/api/cv")
@app.get("/cv")
def get_cv():
    """Return full CV data for sidebar and static content."""
    return _cv_data()


@app.post("/api/ask")
@app.post("/ask")
def ask_ai(question: str = Body(..., embed=True), history: list[dict] | None = Body(None, embed=True)):
    if not question or not question.strip():
        return {"answer": "Please provide a question."}
    try:
        data = load_data()
        answer = answer_question(question.strip(), data, history=history)
        return {"answer": answer}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)