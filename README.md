# Teachable backup

This is a script to backup a [Teachable](https://docs.teachable.com/) school using the official API, which is available to premium plans. As per [Teachable’s house rules](https://teachable.com/house-rules#:~:text=Backing%20up%20your%20content), users are responsible for backing up their own content:

> Backing up your content  
> Teachable is not intended to be used as a backup for your content. Be safe and keep a secure copy of all the content that is uploaded to Teachable, including content uploaded by other administrator users associated with your school, such as non-primary owners and authors.

```sh
git clone https://github.com/KittyGiraudel/teachable-backup
cd teachable-backup
npm install
npm start
```

Note that this script expects Node.js v18+. Consider using [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions.

## Devcontainer usage

Update your `.env` file. In the devcontainer in VScode, run `npm start`.

## Configuration

All configuration options can be passed via a `.env` file at the root of the repository, or directly when executing the script.

The only required variable is `API_KEY`, containing the [Teachable API key](https://docs.teachable.com/docs/authentication).

Other options (and their default value) include:

```sh
# Whether to emit logs (recommended for visibility)
VERBOSE=1

# Whether to use read from cache at all (recommended for speed and to avoid rate
# limit issues)
CACHE=1

# Whether to download attachements, and how many at a time (slow)
FILE_CONCURRENCY=0

# Which directory to write in
CACHE_DIR=.dist
```

## Output

It creates a folder structure like the one below. Paths marked with a question mark indicates they may or may not exist depending on the data.

```sh
{CACHE_DIR}/
|
|– courses/
|  |– courses.json
|  |  # This sub-structure appears once per course
|  |– {course_id}/
|     |– course.json
|     |– {course_thumbnail}?
|     |– sections/
|        | # This sub-structure appears once per section
|        |– {section_id}/
|           |– lectures/
|              | # This sub-structure appears once per lecture
|              |– {lecture_id}/
|                 |– lecture.json
|                 |– {attachment_file}?
|
|– users/
|  |– users.json
|  |  # This sub-structure appears once per user
|  |– {user_id}/
|     |– user.json
|
|– pricingPlans/
   |– pricingPlans.json
   |  # This sub-structure appears once per pricing plan
   |– {pricing_plan_id}/
      |– pricingPlan.json
```

## Rate limiting

This script is subject to [Teachable’s API rate limit](https://docs.teachable.com/docs/rate-limits) of 100 requests per minute.

It makes use of [throttled-queue](https://github.com/shaunpersad/throttled-queue) to cap the limit to 1 request per second. This of course makes the script quite slow, but ensures the rate limit is never reached. This value could be tweaked in `utils.mjs` is so desired.

## Attachements

As mentioned in the [Configuration](#configuration) section, the `FILE_CONCURRENCY` option can be turned on (set to `1` or more) to download lecture attachments (typically from the Teachable CDN). However, this can be pretty slow (depending on the amount of data and the size of the attachements) which is why it’s turned off by default.

When enabled, attachements are downloaded somewhat sequentially, using [p-queue](https://github.com/sindresorhus/p-queue) to restrict concurrency (to the given value). Feel free to tweak the number, but know that too many connections might cause some requests to fail.

It is recommended to run the script a first time without files to back up all users, pricing plans, courses and lectures as JSON rapidly, and then a second time with files to back up attachments.
