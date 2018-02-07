Basic usage:

```js
<TitleBar title='What a great title' />
```

With optional subtitle:

``` js
<TitleBar title='What a great title' subtitle='I know, right?' />
```

With optional back button:

```js
initialState = {subtitle: 'Subpage'}

;<div>
  <TitleBar
    title='Page'
    subtitle={state.subtitle}
    onBackClick={() => setState({subtitle: null})}
  />
  <FlatButton onClick={() => setState({subtitle: 'Subpage'})}>
    Go to Subpage
  </FlatButton>
</div>
```

`title` and `subtitle` are `React.Node`s, so pass whatever you need:

```js
<TitleBar title={(
  <a href='#titlebar' style={{textDecoration: 'none'}}>
    Title <em>and</em> a link
  </a>
)} />
```
