# 0.1.6

*   Fix initDb to return empty taffyDb if `config.local.save` was set to `NEVER`

# 0.1.5

*   Added local storage functionality

# 0.1.4

*   Request was being requried before each use, which was causing a timeout
    problems. Updated the code to use a single request object.

# 0.1.3

*   Added userFileSave function, which allows users to do custom (async) actions
    to a file after the raw data has been pulled in.

# 0.1.2

*   Added github authentication and thus the ability to access private gists

# 0.1.1

*   Added gist object to file for meta data on the gist the file is from.

*   Changed database refresh to use merge rather than insert so items won't
    duplicate

*   Added check just before getRawFile and the add to database that checks if
    the file is in the db and if it is compares if the gist.updated_at of the
    new file is newer than that of the old file. This was can lower the number
    of calls to github and speed up the code a bit.

*   Changed github module to be my fork which supports since on the gist
    endpoints. Will change back once a new version of node-github is in NPM

*   Added since param to github calls, so we will only return gists added/edited
    since our last call.
