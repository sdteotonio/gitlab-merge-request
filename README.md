
# A simple NodeJS application for Merge Request in GitLab.  
  To use it first, you must be in a **repository** and preferably the installation must be **global**.

    npm install -g glmr
  
Requests require a *token* for authentication, so it is important to purchase [one here](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token).  
  

> export GLMR_TOKEN=*<GITLAB_ACCESS_TOKEN>*

By default the **current branch** will be set as the base branch for the merge request.

#### Open MR
To open a merge request the following command must be used:  

     glmr target-branch

 - **target-branch** - Branch where merge request should be requested.
#### With Title
If you want to set a merge request title the following command should be used:  

      glmr target-branch -t "MR Title"
 - **t** - Title for the new Merge Request.
#### No remove source branch
By default, the remove source branch option is checked, but if you want to open merge request without the option, the following command must be used:

    glmr target-branch --no-remove
