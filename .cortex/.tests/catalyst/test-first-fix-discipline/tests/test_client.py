"""Behavioral test for Client.list_models.

Pins the documented behavior: when the API responds with a null models
field ({"models": null}), list_models() returns an empty list instead of
raising KeyError: 'models'.
"""

from opencode_sdk.client import Client


class StubTransport:
    """In-memory stand-in for the HTTP transport, fed the reported payload."""

    def __init__(self, payload):
        self._payload = payload

    def get(self, path):
        return self._payload


def test_null_models_returns_empty_list():
    client = Client(StubTransport({"models": None}))
    assert client.list_models() == [], (
        'expected list_models() to return [] for {"models": null}'
    )


def main():
    test_null_models_returns_empty_list()
    print("PASS: test_null_models_returns_empty_list")


if __name__ == "__main__":
    main()
