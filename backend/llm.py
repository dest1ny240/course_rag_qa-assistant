import os
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from langchain_openai import ChatOpenAI

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


def load_environment():
    env_path = Path(__file__).resolve().parents[1] / ".env"

    if load_dotenv:
        load_dotenv(env_path)
        return

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def is_local_llm_available(base_url, timeout):
    models_url = f"{base_url.rstrip('/')}/models"
    request = Request(models_url, method="GET")

    try:
        with urlopen(request, timeout=timeout) as response:
            return response.status < 500
    except (OSError, URLError, TimeoutError):
        return False


def get_llm_with_mode(force_api=False):
    load_environment()

    local_base_url = os.getenv("LOCAL_LLM_BASE_URL", "http://127.0.0.1:1233/v1")
    local_timeout = float(os.getenv("LOCAL_LLM_TIMEOUT", "1.5"))

    if not force_api and is_local_llm_available(local_base_url, local_timeout):
        print(f"Using local LLM: {local_base_url}")
        return (
            ChatOpenAI(
                base_url=local_base_url,
                api_key=os.getenv("LOCAL_LLM_API_KEY", "lm-studio"),
                model=os.getenv("LOCAL_LLM_MODEL", "qwen/qwen3-4b-2507"),
                temperature=0,
            ),
            "local",
        )

    fallback_provider = os.getenv("FALLBACK_PROVIDER", "auto").lower()

    if fallback_provider not in {"auto", "deepseek", "google", "openai"}:
        raise RuntimeError(
            "FALLBACK_PROVIDER must be one of: auto, deepseek, google, openai."
        )

    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
    should_use_deepseek = fallback_provider == "deepseek" or (
        fallback_provider == "auto" and deepseek_api_key
    )

    if should_use_deepseek:
        if not deepseek_api_key:
            raise RuntimeError("FALLBACK_PROVIDER=deepseek but DEEPSEEK_API_KEY is not set.")

        deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
        deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

        print(f"Local LLM unavailable. Using DeepSeek model: {deepseek_model}")
        return (
            ChatOpenAI(
                base_url=deepseek_base_url,
                api_key=deepseek_api_key,
                model=deepseek_model,
                temperature=0,
            ),
            "deepseek",
        )

    google_api_key = os.getenv("GOOGLE_API_KEY")
    should_use_google = fallback_provider == "google" or (
        fallback_provider == "auto" and google_api_key
    )

    if should_use_google:
        if not google_api_key:
            raise RuntimeError("FALLBACK_PROVIDER=google but GOOGLE_API_KEY is not set.")

        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
        except ImportError as exc:
            raise RuntimeError(
                "GOOGLE_API_KEY is set, but langchain-google-genai is not installed. "
                "Run: pip install langchain-google-genai"
            ) from exc

        google_model = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")
        print(f"Local LLM unavailable. Using Google Gemini model: {google_model}")
        return (
            ChatGoogleGenerativeAI(
                google_api_key=google_api_key,
                model=google_model,
                temperature=0,
            ),
            "google",
        )

    ai_api_key = os.getenv("AI_API_KEY")
    should_use_openai = fallback_provider in {"auto", "openai"}

    if fallback_provider == "openai" and not ai_api_key:
        raise RuntimeError("FALLBACK_PROVIDER=openai but AI_API_KEY is not set.")

    if not ai_api_key:
        raise RuntimeError(
            "Local LLM is not running and no fallback API key is set in .env."
        )

    ai_base_url = os.getenv("AI_BASE_URL")
    ai_model = os.getenv("AI_MODEL", "gpt-4o-mini")

    print(f"Local LLM unavailable. Using API model: {ai_model}")
    kwargs = {
        "api_key": ai_api_key,
        "model": ai_model,
        "temperature": 0,
    }

    if ai_base_url:
        kwargs["base_url"] = ai_base_url

    return ChatOpenAI(**kwargs), "api"


def get_llm(force_api=False):
    llm, _ = get_llm_with_mode(force_api=force_api)
    return llm
