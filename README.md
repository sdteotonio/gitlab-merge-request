
# A simple NodeJS application for Merge Request in GitLab.  
  To use it first, you must be in a **repository** and preferably the installation must be **global**.

    

 - > npm install -g glmr
 - > glmr -v
  - > glmr --help
  
#### Requests require a *token* for authentication, so it is important to purchase [one here](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token).  
Once you get your token, you must set it to the local repository, follow the example:
> git config --add gitlab.token "GITLAB-ACCESS-TOKEN"

By default the **current branch** will be set as the base branch for the merge request.

#### Open Merge Request
To open a merge request the following command must be used:  

     glmr target-branch

 - **target-branch** - Branch where merge request should be requested.
#### Title
If you want to set a merge request title the following command should be used:  

      glmr target-branch -t "MR Title"
#### No remove source branch
By default, the remove source branch option is checked, but if you want to open merge request without the option, the following command must be used:

    glmr target-branch --no-remove
#### WIP
If you want to open a Merge Request with WIP, the following command must be used:

    glmr target-branch -w
or

    glmr target-branch --wip
#### Assignee
If you want to open a Merge Request by signing for some user, the following command must be used:

    glmr target-branch -u user.name
or

    glmr target-branch --user user.name
#### Default values
> git config --add glmr.remove < true | false >
- Set default remove source branch flag
> git config --add glmr.target "target-branch"
- Set default target branch