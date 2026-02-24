from app.providers.base import BaseProvider
from app.providers.mock_provider import MockProvider
from app.providers.api_provider import ApiProvider

_PROVIDERS: dict[str, BaseProvider] = {
    "mock": MockProvider(),
    "api": ApiProvider(),
}


def get_provider(provider_id: str) -> BaseProvider | None:
    return _PROVIDERS.get(provider_id)


def list_providers() -> list[str]:
    return list(_PROVIDERS.keys())
