from abc import ABC, abstractmethod


class BaseProvider(ABC):
    """Interface for design product providers."""

    provider_id: str

    @abstractmethod
    async def search(
        self,
        keywords: list[str],
        dominant_color: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[dict]:
        """Search for products matching the design profile.

        Returns list of dicts with keys:
            title, image_url, product_url, price, color_hex, tags
        """
        ...
