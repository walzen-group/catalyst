"""HTTP client for the OpenCode API."""


class Model:
    def __init__(self, id: str, name: str):
        self.id = id
        self.name = name

    @classmethod
    def from_dict(cls, data: dict) -> "Model":
        return cls(id=data["id"], name=data["name"])

    def __eq__(self, other) -> bool:
        return isinstance(other, Model) and (self.id, self.name) == (other.id, other.name)

    def __repr__(self) -> str:
        return f"Model(id={self.id!r}, name={self.name!r})"


class Client:
    def __init__(self, transport):
        self._transport = transport

    def _json(self, path: str) -> dict:
        """Fetch a JSON body, dropping null-valued keys before use."""
        body = self._transport.get(path)
        return {k: v for k, v in body.items() if v is not None}

    def list_models(self) -> list:
        data = self._json("/models")
        return [Model.from_dict(m) for m in data.get("models", [])]
