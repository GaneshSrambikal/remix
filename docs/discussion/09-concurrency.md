---
title: Network Concurrency Management
---

# Network Concurrency Management

When building web applications, managing network requests can be a daunting task. The challenges of ensuring up-to-date data and handling simultaneous requests often lead to complex logic in the application to deal with interruptions and race conditions. Remix simplifies this process by automating network management, mirroring and expanding the intuitive behavior of web browsers.

## Natural Alignment with Browser Behavior

Remix's handling of network concurrency is heavily inspired by the default behavior of web browsers when processing documents:

- **Browser Link Navigation**: When you click on a link in a browser and then click on another before the page transition completes, the browser prioritizes the most recent action. It cancels the initial request, focusing solely on the latest link clicked.

  - **Remix's Approach**: In a similar fashion, Remix manages client-side navigation seamlessly. When a link is clicked within a Remix application, it initiates fetch requests for each loader tied to the target URL. If another navigation interrupts the initial navigation, Remix cancels the previous fetch requests, ensuring that only the latest requests proceed.

- **Browser Form Submission**: If you initiate a form submission in a browser and then quickly submit another form again, the browser disregards the first submission, processing only the latest one.

  - **Remix's Approach**: Remix mimics this behavior when working with forms. If a form is submitted and another submission occurs before the first completes, Remix cancels the original fetch request or revalidation requests. It then waits for the latest submission to complete before triggering page revalidation.

## Enhanced Concurrency Management

While standard browsers are limited to one request at a time for navigations and form submissions, Remix elevates this behavior. Unlike navigation, with `useFetcher`, multiple requests can be in flight simultaneously.

To help understand how Remix works, remember from [Fullstack Data Flow](./03-data-flow) that after a form submissions, Remix will fetches fresh data from the loaders that make up the current UI. This is called revalidation.

## Concurrent Submissions and Revalidation

Remix is designed to handle multiple form submissions to server actions and concurrent revalidation requests efficiently. It ensures that as soon as new data is available, the state is updated promptly. However, Remix also safeguards against potential pitfalls by refraining from committing stale data when other actions introduce race conditions.

For instance, if three form submissions are in progress, and one completes, Remix updates the UI with that data immediately without waiting for the other two so that the UI remains responsive and dynamic. As the remaining submissions finalize, Remix continues to update the UI, ensuring that the most recent data is displayed.

To help understand some visualizations, below is a key for the symbols used in the diagrams:

- `|`: Submission begins
- ✓: Action complete, data revalidation begins
- ✅: Revalidated data is committed to the UI
- ❌: Request cancelled

```text
submission 1: |----✓-----✅
submission 2:    |-----✓-----✅
submission 3:             |-----✓-----✅
```

However, if a subsequent submission's revalidation completes before an earlier one, Remix discards the earlier data, ensuring that only the most up-to-date information is reflected in the UI.

```text
submission 1: |----✓---------❌
submission 2:    |-----✓-----✅
submission 3:             |-----✓-----✅
```

Because the revalidation from submission (2) started later and landed earlier than submission (1), the requests from submission (1) are cancelled and only the data from submission (2) is committed to the UI. It was requested later so its more likely to contain the updated values from both (1) and (2).

## Potential for Stale Data

There are still chances for the user to see stale data in very rare conditions with inconsistent infrastructure. Cancelled requests from the browser still end up going to the server and may change data after the revalidation lands. For example, if a form is interrupted by a new submission of the same form:

```text
     👇 interruption with new submission
|----❌----------------------✓
       |-------✓-----✅
                             👆
                  initial request reaches the server
```

The user is now looking at different data than what is on the server. Note that this problem is both extremely rare and exists with default browser behavior, too. The chance of the initial request reaching the server later than both the submission and revalidation of the second is unexpected on any network and server infrastructure. If this is a concern in your app because of inconsistent infrastructure, you can send time stamps with your form submissions and write server logic to ignore stale submissions.

## Conclusion

Remix offers developers an intuitive, automated approach to managing network requests. By mirroring browser behaviors and enhancing them where needed, it simplifies the complexities of concurrency, revalidation, and potential race conditions. Whether you're building a simple webpage or a sophisticated web application, Remix ensures that your user interactions are smooth, reliable, and always up-to-date.

## Example

In UI components like comboboxes, each keystroke can trigger a network request. Managing such rapid, consecutive requests can be tricky, especially when ensuring that the displayed results match the most recent query. However, with Remix, this challenge is automatically handled, ensuring that users see the correct results without developers having to micro-manage the network.

```tsx filename=app/routes/city-search.tsx
import { json } from "@remix-run/react";

export async function loader({ request }: LoaderArgs) {
  const { searchParams } = new URL(request.url);
  const cities = await searchCities(searchParams.get("q"));
  return json(cities);
}

export function CitySearchCombobox() {
  const fetcher = useFetcher();

  return (
    <fetcher.Form action="/city-search">
      <Combobox aria-label="Cities">
        <ComboboxInput
          name="q"
          onChange={(event) =>
            // submit the form onChange to get the list of cities
            fetcher.submit(event.target.form)
          }
        />

        {/* render with the loader's data */}
        {fetcher.data ? (
          <ComboboxPopover className="shadow-popup">
            {fetcher.data.length ? (
              <ComboboxList>
                {fetcher.data.map((city) => (
                  <ComboboxOption
                    key={city.id}
                    value={city.name}
                  />
                ))}
              </ComboboxList>
            ) : (
              <span>No results found</span>
            )}
          </ComboboxPopover>
        ) : null}
      </Combobox>
    </fetcher.Form>
  );
}
```

Even though we don't see any code to manage race conditions or committing the latest data to state, Remix handles it automatically. All the application needs to know is how to query the data and how to render it.