export function findRoutes(graph, start, target, options = {}) {
  const config = {
    budget: Infinity,
    maxStops: 4,
    maxResults: 20,
    ...options,
  };

  const results = [];

  deepFirstSearch(
    graph,
    start,
    target,
    {
      path: [start],
      cost: 0,
      distance: 0,
    },
    { results, options: config }
  );

  return results.sort((a, b) => a.cost - b.cost);
}

function deepFirstSearch(graph, current, target, state, context) {
  const { path, cost, distance } = state;
  const { results, options } = context;

  if (!canContinue(state, options)) return;

  if (isSolution(current, target, state)) {
    results.push(formatResult(state));
    return;
  }

  if (results.length >= options.maxResults) return;

  const neighbors = graph[current] || [];

  for (const edge of neighbors) {
    const next = edge.to;

    if (path.includes(next)) continue;

    deepFirstSearch(
      graph,
      next,
      target,
      {
        path: [...path, next],
        cost: cost + edge.price,
        distance: distance + edge.distance,
      },
      context
    );
  }
}

function canContinue(state, options) {
  const { cost, path } = state;
  const { budget, maxStops } = options;

  if (cost > budget + 200) return false;
  if (path.length > maxStops + 1) return false;

  return true;
}

function isSolution(current, target, state) {
  return current === target && state.path.length > 1;
}

function formatResult(state) {
  return {
    path: state.path,
    cost: Math.round(state.cost),
    distance: Math.round(state.distance),
  };
}
