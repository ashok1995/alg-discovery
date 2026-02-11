#!/usr/bin/env python3
"""
CLI entry-point that launches all configured cron jobs.

Usage::

    python -m alg_discovery.cron.runner

This will start the event-loop and spin up all schedulers defined in
`alg_discovery.cron.schedules`.
"""

import asyncio
from alg_discovery.cron.schedules import start_all


def main() -> None:  # pragma: no cover – thin wrapper
    asyncio.run(start_all())


if __name__ == "__main__":
    main() 